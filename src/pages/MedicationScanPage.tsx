import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { searchDrugDatabase } from "../services/drugSearch";
import { compressImage, estimateDataUrlSize } from "../services/image";
import { extractDrugNameCandidates, recognizeMedicationLabel } from "../services/ocr";
import type {
  CareProfile,
  DrugDatabaseMatch,
  Medication,
  OcrScan,
  TemporaryMedication,
} from "../types";

interface MedicationScanPageProps {
  careProfiles: CareProfile[];
  currentProfile: CareProfile;
  onConfirmMedication: (medication: Medication, scan: OcrScan) => void;
  onCreateTemporaryMedication: (medication: TemporaryMedication, scan: OcrScan) => void;
}

export function MedicationScanPage({
  careProfiles,
  currentProfile,
  onConfirmMedication,
  onCreateTemporaryMedication,
}: MedicationScanPageProps): ReactElement {
  const [selectedProfileId, setSelectedProfileId] = useState(currentProfile.id);
  const selectedProfile = careProfiles.find((profile) => profile.id === selectedProfileId) || careProfiles[0] || currentProfile;
  const [photoDataUrl, setPhotoDataUrl] = useState<string>();
  const [photoName, setPhotoName] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [ocrConfidence, setOcrConfidence] = useState(0);
  const [progress, setProgress] = useState("");
  const [candidates, setCandidates] = useState<string[]>([]);
  const [matches, setMatches] = useState<DrugDatabaseMatch[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualIngredient, setManualIngredient] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (careProfiles.length && !careProfiles.some((profile) => profile.id === selectedProfileId)) {
      setSelectedProfileId(careProfiles[0].id);
    }
  }, [careProfiles, selectedProfileId]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  async function handleFile(file: File): Promise<void> {
    try {
      setIsProcessing(true);
      setProgress("이미지를 압축하는 중");
      setPhotoName(file.name);
      const dataUrl = await compressImage(file);
      setPhotoDataUrl(dataUrl);

      setProgress("OCR 모델을 불러오는 중");
      const ocr = await recognizeMedicationLabel(dataUrl, (nextProgress) => {
        setProgress(`${nextProgress.status} ${nextProgress.progress}%`);
      });
      setOcrText(ocr.text);
      setOcrConfidence(ocr.confidence);

      const nextCandidates = extractDrugNameCandidates(ocr.text);
      setCandidates(nextCandidates);

      setProgress("약 데이터베이스 후보를 검색하는 중");
      const resultGroups = await Promise.all(nextCandidates.slice(0, 4).map(searchDrugDatabase));
      setMatches(dedupeMatches(resultGroups.flat()));
      setProgress("사용자 확인 대기");
    } catch (error) {
      const message = error instanceof Error ? error.message : "사진 처리 중 문제가 발생했습니다.";
      setProgress(message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function openCamera(): Promise<void> {
    setCameraError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("이 브라우저에서는 직접 촬영을 지원하지 않습니다. 파일 첨부를 사용해 주세요.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
        },
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      setProgress("카메라가 열렸습니다. 화면을 맞춘 뒤 촬영해 주세요.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setCameraError(
        message.includes("Permission")
          ? "카메라 권한이 차단되었습니다. 브라우저 설정에서 카메라 권한을 허용해 주세요."
          : "카메라를 열 수 없습니다. 카메라가 없는 기기라면 파일 첨부를 사용해 주세요.",
      );
    }
  }

  async function capturePhoto(): Promise<void> {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2) {
      setCameraError("카메라 화면이 아직 준비되지 않았습니다. 잠시 후 다시 촬영해 주세요.");
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("촬영 이미지를 만들 수 없습니다. 파일 첨부를 사용해 주세요.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.9);
    });

    if (!blob) {
      setCameraError("촬영 이미지를 저장할 수 없습니다. 다시 시도해 주세요.");
      return;
    }

    closeCamera();
    await handleFile(new File([blob], `optime-photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
  }

  function closeCamera(): void {
    cameraStream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStream(null);
    setIsCameraOpen(false);
  }

  async function handleManualSearch(): Promise<void> {
    const query = manualName.trim();
    if (!query) {
      setProgress("검색할 약 이름을 입력해 주세요.");
      return;
    }

    setIsProcessing(true);
    setProgress(`"${query}" 약 데이터베이스 검색 중`);
    const nextMatches = await searchDrugDatabase(query);
    setCandidates((current) => Array.from(new Set([query, ...current])));
    setMatches(dedupeMatches(nextMatches));
    setOcrText((current) => current || `수기 검색: ${query}`);
    setProgress(nextMatches.length ? "검색 후보를 확인해 주세요." : "공식 후보 없음. 임시약 저장 또는 수기 보완이 필요합니다.");
    setIsProcessing(false);
  }

  function buildScan(status: OcrScan["status"], nextMatches: DrugDatabaseMatch[] = matches): OcrScan {
    const id = crypto.randomUUID();
    return {
      id,
      workspaceId: selectedProfile.workspaceId,
      careProfileId: selectedProfile.id,
      status,
      rawText: ocrText,
      extractedNames: candidates,
      confidence: ocrConfidence,
      matches: nextMatches,
      createdAt: new Date().toISOString(),
      photo: photoDataUrl
        ? {
            id: crypto.randomUUID(),
            scanId: id,
            fileName: photoName || "medication-label.jpg",
            dataUrl: photoDataUrl,
            sizeBytes: estimateDataUrlSize(photoDataUrl),
          }
        : undefined,
    };
  }

  function confirmMatch(match: DrugDatabaseMatch): void {
    const scan = buildScan("confirmed", matches);
    onConfirmMedication(
      {
        id: crypto.randomUUID(),
        careProfileId: selectedProfile.id,
        status: "confirmed",
        productName: match.productName,
        source: match.source,
        ingredients: match.ingredients,
        dosage: match.dosageForm,
        instructions: match.usage,
        warnings: match.warnings,
        interactions: match.interactions,
        startedAt: new Date().toISOString().slice(0, 10),
        reviewAt: reviewDateFromToday(30),
      },
      scan,
    );
    setProgress(`${match.productName} 등록 완료`);
  }

  function saveTemporary(): void {
    const rawName = manualName || candidates[0] || "이름 미확인 약";
    const scan = buildScan("manual_needed", matches);
    onCreateTemporaryMedication(
      {
        id: crypto.randomUUID(),
        careProfileId: selectedProfile.id,
        rawName,
        rawText: ocrText,
        note: manualIngredient ? `수기 성분: ${manualIngredient}` : "사용자 보완 필요",
        createdAt: new Date().toISOString(),
      },
      scan,
    );
    setProgress(`${rawName} 임시약으로 저장 완료`);
  }

  return (
    <div className="scan-layout">
      <section className="card scan-card">
        <div className="section-heading">
          <p className="eyebrow">OCR Registration</p>
          <h2>약 사진 등록</h2>
          <p className="muted">사진에는 이름, 생년월일, 병원/약국 정보가 포함될 수 있습니다. 기본 저장되며 나중에 사진만 삭제할 수 있습니다.</p>
        </div>

        <label className="field-label" htmlFor="care-profile">등록 대상</label>
        <select id="care-profile" onChange={(event) => setSelectedProfileId(event.target.value)} value={selectedProfileId}>
          {careProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>

        <label className="field-label">약·영양제 사진</label>
        <div className="capture-actions">
          <button className="primary-button" onClick={() => void openCamera()} type="button">
            카메라로 촬영
          </button>
          <button className="ghost-button" onClick={() => fileInputRef.current?.click()} type="button">
            파일 첨부
          </button>
        </div>
        {isCameraOpen && (
          <div className="camera-panel">
            <video
              aria-label="카메라 미리보기"
              autoPlay
              className="camera-preview"
              muted
              onLoadedMetadata={() => void videoRef.current?.play()}
              playsInline
              ref={videoRef}
            />
            <div className="capture-actions">
              <button className="primary-button" onClick={() => void capturePhoto()} type="button">
                촬영하기
              </button>
              <button className="ghost-button" onClick={closeCamera} type="button">
                카메라 닫기
              </button>
            </div>
            <canvas className="hidden-input" ref={canvasRef} />
          </div>
        )}
        {cameraError && <p className="form-note error-note">{cameraError}</p>}
        <input
          accept="image/*"
          className="hidden-input"
          ref={fileInputRef}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void handleFile(file);
            event.currentTarget.value = "";
          }}
          type="file"
        />
        <p className="muted">기기 카메라로 바로 촬영하거나, 저장된 이미지를 파일로 첨부할 수 있습니다.</p>

        {photoDataUrl && (
          <figure className="photo-preview">
            <img alt="등록할 약 사진" src={photoDataUrl} />
            <figcaption>
              압축 저장 예정 · 약 {Math.round(estimateDataUrlSize(photoDataUrl) / 1024)}KB
              <button className="ghost-button" onClick={() => setPhotoDataUrl(undefined)} type="button">
                사진 삭제
              </button>
            </figcaption>
          </figure>
        )}

        <div className="scan-status">
          <strong>{isProcessing ? "처리 중" : "상태"}</strong>
          <span>{progress || "사진을 촬영하거나 파일로 첨부해 주세요."}</span>
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <p className="eyebrow">Detected Text</p>
          <h2>OCR 결과와 후보</h2>
        </div>
        <textarea
          aria-label="OCR 원문"
          onChange={(event) => setOcrText(event.target.value)}
          placeholder="OCR 결과가 여기에 표시됩니다. 잘못 인식된 약명은 직접 수정할 수 있습니다."
          rows={8}
          value={ocrText}
        />
        <p className="muted">OCR 신뢰도: {ocrConfidence || 0}%</p>
        <div className="tag-list">
          {candidates.map((candidate) => (
            <button className="tag-button" key={candidate} onClick={() => setManualName(candidate)} type="button">
              {candidate}
            </button>
          ))}
        </div>
      </section>

      <section className="card full-span">
        <div className="section-heading">
          <p className="eyebrow">Drug Database Matches</p>
          <h2>공식 DB 후보 확인</h2>
          <p className="muted">
            실제 공식 데이터베이스 검색 결과만 표시합니다. 후보가 없으면 수기 입력 후 임시약으로 저장해 주세요.
          </p>
        </div>
        <div className="manual-search">
          <input
            aria-label="약 이름 직접 검색"
            onChange={(event) => setManualName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleManualSearch();
            }}
            placeholder="약 이름 직접 입력: 예) 타이레놀, 오메가3, 감기약"
            type="text"
            value={manualName}
          />
          <button className="primary-button" onClick={() => void handleManualSearch()} type="button">
            약DB 검색
          </button>
        </div>
        <div className="match-grid">
          {matches.map((match) => (
            <article className="match-card" key={match.id}>
              <div>
                <strong>{match.productName}</strong>
                <p>{match.source} · 신뢰도 {Math.round(match.confidence * 100)}%</p>
                <p>{match.ingredients.map((ingredient) => `${ingredient.name} ${ingredient.amount || ""}`).join(", ")}</p>
              </div>
              <button className="primary-button" onClick={() => confirmMatch(match)} type="button">
                이 약으로 등록
              </button>
            </article>
          ))}
        </div>
        {!matches.length && (
          <p className="form-note">
            아직 공식 DB 후보가 없습니다. 검색어를 바꾸거나 아래에서 약명과 성분을 직접 입력해 저장할 수 있습니다.
          </p>
        )}
        <div className="manual-box">
          <h3>후보에 없나요?</h3>
          <input
            aria-label="수기 약명"
            onChange={(event) => setManualName(event.target.value)}
            placeholder="약명 또는 라벨에 보이는 이름"
            type="text"
            value={manualName}
          />
          <input
            aria-label="수기 성분"
            onChange={(event) => setManualIngredient(event.target.value)}
            placeholder="성분/함량을 알면 입력"
            type="text"
            value={manualIngredient}
          />
          <button className="temporary-button" onClick={saveTemporary} type="button">
            임시약으로 저장
          </button>
        </div>
      </section>
    </div>
  );
}

function dedupeMatches(matches: DrugDatabaseMatch[]): DrugDatabaseMatch[] {
  return Array.from(new Map(matches.map((match) => [match.id, match])).values()).slice(0, 6);
}

function reviewDateFromToday(days: number): string {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
}
