import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { searchDrugDatabase } from "../services/drugSearch";
import { compressImage, estimateDataUrlSize } from "../services/image";
import { extractDrugNameCandidates, recognizeMedicationLabel } from "../services/ocr";
import type {
  CareProfile,
  DrugDatabaseMatch,
  DrugSource,
  Medication,
  OcrScan,
  TemporaryMedication,
} from "../types";
import { ingredientSummary, sourceLabel } from "../utils/medicationDisplay";

interface MedicationScanPageProps {
  careProfiles: CareProfile[];
  currentProfile: CareProfile;
  medications: Medication[];
  onDeleteMedication: (medicationId: string) => Promise<void> | void;
  onConfirmMedication: (medication: Medication, scan: OcrScan) => Promise<void> | void;
  onCreateTemporaryMedication: (medication: TemporaryMedication, scan: OcrScan) => Promise<void> | void;
}

const MATCH_PAGE_SIZE = 10;
const MATCH_RESULT_LIMIT = 50;

export function MedicationScanPage({
  careProfiles,
  currentProfile,
  medications,
  onDeleteMedication,
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
  const [registrationDosage, setRegistrationDosage] = useState("");
  const [registrationInstructions, setRegistrationInstructions] = useState("");
  const [registrationReviewAt, setRegistrationReviewAt] = useState("");
  const [activeRegistrationMode, setActiveRegistrationMode] = useState<"search" | "photo">("search");
  const [medicationFilter, setMedicationFilter] = useState<"all" | "active" | "review">("all");
  const [medicationSearch, setMedicationSearch] = useState("");
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<DrugSource | "all">("all");
  const [matchDisplayCount, setMatchDisplayCount] = useState(MATCH_PAGE_SIZE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingMatchId, setSavingMatchId] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [deletingMedicationId, setDeletingMedicationId] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savingLockRef = useRef(false);

  useEffect(() => {
    if (careProfiles.length && !careProfiles.some((profile) => profile.id === selectedProfileId)) {
      setSelectedProfileId(careProfiles[0].id);
    }
  }, [careProfiles, selectedProfileId]);

  useEffect(() => {
    if (careProfiles.some((profile) => profile.id === currentProfile.id)) {
      setSelectedProfileId(currentProfile.id);
    }
  }, [careProfiles, currentProfile.id]);

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

  function resetSearchArtifacts(options?: { preserveManualName?: boolean }): void {
    setOcrText("");
    setOcrConfidence(0);
    setCandidates([]);
    setMatches([]);
    setManualIngredient("");
    setPhotoDataUrl(undefined);
    setPhotoName("");
    setCameraError("");
    setSourceFilter("all");
    setMatchDisplayCount(MATCH_PAGE_SIZE);
    if (!options?.preserveManualName) {
      setManualName("");
    }
  }

  function resetRegistrationOptions(): void {
    setRegistrationDosage("");
    setRegistrationInstructions("");
    setRegistrationReviewAt("");
  }

  const selectedProfileMedications = medications.filter(
    (medication) => medication.careProfileId === selectedProfile.id,
  );
  const filteredProfileMedications = selectedProfileMedications
    .filter((medication) => {
      if (medicationFilter === "active") return medication.status === "confirmed";
      if (medicationFilter === "review") return medication.status !== "confirmed";
      return true;
    })
    .filter((medication) => {
      const query = medicationSearch.trim().toLocaleLowerCase("ko-KR");
      if (!query) return true;
      return [
        medication.productName,
        medication.dosage,
        medication.instructions,
        ingredientSummary(medication.ingredients),
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase("ko-KR").includes(query));
    });
  const registeredMedicationKeys = new Set(
    selectedProfileMedications.map((medication) => medicationKey(medication.source, medication.productName)),
  );
  const sourceOptions = Array.from(new Set(matches.map((match) => match.source)));
  const filteredMatches =
    sourceFilter === "all"
      ? matches
      : matches.filter((match) => match.source === sourceFilter);
  const visibleMatches = filteredMatches.slice(0, matchDisplayCount);
  const hasMoreMatches = visibleMatches.length < filteredMatches.length;

  function changeSourceFilter(nextSource: DrugSource | "all"): void {
    setSourceFilter(nextSource);
    setMatchDisplayCount(MATCH_PAGE_SIZE);
  }

  async function handleFile(file: File): Promise<void> {
    try {
      resetSearchArtifacts();
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
      setMatchDisplayCount(MATCH_PAGE_SIZE);
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

    try {
      resetSearchArtifacts({ preserveManualName: true });
      setIsProcessing(true);
      setProgress(`"${query}" 약 데이터베이스 검색 중`);
      const nextMatches = await searchDrugDatabase(query);
      setCandidates([query]);
      setMatches(dedupeMatches(nextMatches));
      setMatchDisplayCount(MATCH_PAGE_SIZE);
      setProgress(
        nextMatches.length
          ? "검색 후보를 확인해 주세요."
          : "공식 후보 없음. 임시약 저장 또는 수기 보완이 필요합니다.",
      );
    } catch (error) {
      setProgress(error instanceof Error ? error.message : "약DB 검색 중 문제가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
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

  async function confirmMatch(match: DrugDatabaseMatch): Promise<void> {
    if (savingLockRef.current || isSaving) return;

    savingLockRef.current = true;
    setIsSaving(true);
    setSavingMatchId(match.id);
    const isRegistered = registeredMedicationKeys.has(medicationKey(match.source, match.productName));
    setProgress(`${match.productName} 저장 중`);
    try {
      const scan = buildScan("confirmed", matches);
      await onConfirmMedication(
        {
          id: crypto.randomUUID(),
          careProfileId: selectedProfile.id,
          status: "confirmed",
          productName: match.productName,
          source: match.source,
          ingredients: match.ingredients,
          dosage: registrationDosage.trim() || match.dosageForm,
          instructions: registrationInstructions.trim() || match.usage,
          warnings: match.warnings,
          interactions: match.interactions,
          startedAt: new Date().toISOString().slice(0, 10),
          reviewAt: registrationReviewAt || undefined,
        },
        scan,
      );
      resetSearchArtifacts();
      resetRegistrationOptions();
      setIsRegistrationOpen(false);
      setProgress(isRegistered ? `${match.productName} 기존 기록 갱신 완료` : `${match.productName} 등록 완료`);
    } catch (error) {
      setProgress(error instanceof Error ? error.message : "약 저장 중 문제가 발생했습니다.");
    } finally {
      setIsSaving(false);
      setSavingMatchId("");
      savingLockRef.current = false;
    }
  }

  async function saveTemporary(): Promise<void> {
    if (savingLockRef.current || isSaving) return;

    savingLockRef.current = true;
    setIsSaving(true);
    const rawName = manualName || candidates[0] || "이름 미확인 약";
    setProgress(`${rawName} 임시약 저장 중`);
    try {
      const scan = buildScan("manual_needed", matches);
      await onCreateTemporaryMedication(
        {
          id: crypto.randomUUID(),
          careProfileId: selectedProfile.id,
          rawName,
          rawText: ocrText,
          note: [
            manualIngredient && `수기 성분: ${manualIngredient}`,
            registrationDosage && `복용량: ${registrationDosage}`,
            registrationInstructions && `복용법: ${registrationInstructions}`,
            registrationReviewAt && `검토일: ${registrationReviewAt}`,
          ].filter(Boolean).join(" · ") || "사용자 보완 필요",
          createdAt: new Date().toISOString(),
        },
        scan,
      );
      resetSearchArtifacts();
      resetRegistrationOptions();
      setIsRegistrationOpen(false);
      setProgress(`${rawName} 임시약으로 저장 완료`);
    } catch (error) {
      setProgress(error instanceof Error ? error.message : "임시약 저장 중 문제가 발생했습니다.");
    } finally {
      setIsSaving(false);
      savingLockRef.current = false;
    }
  }

  async function requestDeleteMedication(medication: Medication): Promise<void> {
    const confirmed = window.confirm(`${selectedProfile.name}님의 ${medication.productName} 기록을 삭제할까요?`);
    if (!confirmed) return;

    setDeletingMedicationId(medication.id);
    setProgress(`${medication.productName} 삭제 중`);
    try {
      await onDeleteMedication(medication.id);
      setProgress(`${medication.productName} 삭제 완료`);
    } catch (error) {
      setProgress(error instanceof Error ? error.message : "약 삭제 중 문제가 발생했습니다.");
    } finally {
      setDeletingMedicationId("");
    }
  }

  return (
    <div className="scan-layout">
      <section className="card medication-manager-card">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">등록 약 관리</p>
            <h2>약 관리</h2>
            <p className="muted">{selectedProfile.name}님의 약과 영양제를 한곳에서 관리할 수 있습니다.</p>
          </div>
          <button
            className="primary-button add-medication-button"
            onClick={() => {
              setActiveRegistrationMode("search");
              setIsRegistrationOpen(true);
            }}
            type="button"
          >
            + 약 등록
          </button>
        </div>
        <div className="manager-toolbar">
          <div className="manager-tabs" role="tablist" aria-label="등록 약 필터">
            <button
              aria-selected={medicationFilter === "all"}
              className={medicationFilter === "all" ? "active" : ""}
              onClick={() => setMedicationFilter("all")}
              role="tab"
              type="button"
            >
              전체
            </button>
            <button
              aria-selected={medicationFilter === "active"}
              className={medicationFilter === "active" ? "active" : ""}
              onClick={() => setMedicationFilter("active")}
              role="tab"
              type="button"
            >
              복용 중
            </button>
            <button
              aria-selected={medicationFilter === "review"}
              className={medicationFilter === "review" ? "active" : ""}
              onClick={() => setMedicationFilter("review")}
              role="tab"
              type="button"
            >
              검토
            </button>
          </div>
          <div className="manager-search-tools">
            <input
              aria-label="등록 약 검색"
              onChange={(event) => setMedicationSearch(event.target.value)}
              placeholder="약 이름, 성분, 복용법 검색"
              value={medicationSearch}
            />
            <select
              aria-label="복용 대상 선택"
              onChange={(event) => setSelectedProfileId(event.target.value)}
              value={selectedProfileId}
            >
              {careProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {filteredProfileMedications.length ? (
          <div className="medication-table-list">
            <div className="medication-table-head" aria-hidden="true">
              <span>약 정보</span>
              <span>복용 대상</span>
              <span>복용 방법</span>
              <span>등록 상태</span>
              <span>관리</span>
            </div>
            {filteredProfileMedications.map((medication) => (
              <article className="medication-table-row" key={medication.id}>
                <div>
                  <strong>{medication.productName}</strong>
                  <span>{ingredientSummary(medication.ingredients)}</span>
                </div>
                <span>{selectedProfile.name}</span>
                <span>{medication.instructions || medication.dosage || "복용 정보 미등록"}</span>
                <span className="status-pill done">{sourceLabel(medication.source)}</span>
                <button
                  className="danger-button table-action"
                  disabled={deletingMedicationId === medication.id}
                  onClick={() => void requestDeleteMedication(medication)}
                  type="button"
                >
                  {deletingMedicationId === medication.id ? "삭제 중" : "삭제"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-panel">아직 등록된 약이 없습니다. 오른쪽 위 + 약 등록에서 첫 기록을 추가해 주세요.</p>
        )}
      </section>

      {isRegistrationOpen && (
        <section className="registration-drawer" aria-label="약 등록 패널">
          <div className="card registration-workspace">
            <div className="section-heading split-heading">
              <div>
                <p className="eyebrow">Medication Register</p>
                <h2>약 등록</h2>
                <p className="muted">약명 검색 또는 사진/OCR로 공식 DB 후보를 확인한 뒤 등록합니다.</p>
              </div>
              <button className="ghost-button" onClick={() => setIsRegistrationOpen(false)} type="button">
                닫기
              </button>
            </div>

            <div className="registration-top-grid">
              <label>
                등록 대상
                <select id="care-profile" onChange={(event) => setSelectedProfileId(event.target.value)} value={selectedProfileId}>
                  {careProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="scan-mode-switch" role="tablist" aria-label="약 등록 방식">
                <button
                  aria-selected={activeRegistrationMode === "search"}
                  className={activeRegistrationMode === "search" ? "active" : ""}
                  onClick={() => setActiveRegistrationMode("search")}
                  role="tab"
                  type="button"
                >
                  약 검색
                </button>
                <button
                  aria-selected={activeRegistrationMode === "photo"}
                  className={activeRegistrationMode === "photo" ? "active" : ""}
                  onClick={() => setActiveRegistrationMode("photo")}
                  role="tab"
                  type="button"
                >
                  사진/OCR
                </button>
              </div>
            </div>

            {activeRegistrationMode === "photo" && (
              <div className="photo-register-grid">
                <div className="camera-stage">
                  {isCameraOpen ? (
                    <video
                      aria-label="카메라 미리보기"
                      autoPlay
                      className="camera-preview"
                      muted
                      onLoadedMetadata={() => void videoRef.current?.play()}
                      playsInline
                      ref={videoRef}
                    />
                  ) : photoDataUrl ? (
                    <img alt="등록할 약 사진" src={photoDataUrl} />
                  ) : (
                    <div className="camera-placeholder">
                      <strong>약통을 카메라에 맞춰주세요</strong>
                      <span>라벨의 제품명과 함량이 보이게 촬영하면 좋아요.</span>
                    </div>
                  )}
                  <canvas className="hidden-input" ref={canvasRef} />
                </div>
                <div className="photo-action-panel">
                  <button className="primary-button" onClick={() => (isCameraOpen ? void capturePhoto() : void openCamera())} type="button">
                    {isCameraOpen ? "촬영하기" : "카메라 열기"}
                  </button>
                  <button className="ghost-button" onClick={() => fileInputRef.current?.click()} type="button">
                    파일 첨부
                  </button>
                  {isCameraOpen && (
                    <button className="ghost-button" onClick={closeCamera} type="button">
                      카메라 닫기
                    </button>
                  )}
                  {photoDataUrl && (
                    <button className="ghost-button" onClick={() => setPhotoDataUrl(undefined)} type="button">
                      사진 삭제
                    </button>
                  )}
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
                  {cameraError && <p className="form-note error-note">{cameraError}</p>}
                  <p className="muted">사진에는 개인정보가 포함될 수 있어요. 저장 후 사진만 삭제할 수 있습니다.</p>
                </div>
              </div>
            )}

            <div className="registration-search-panel">
              <div>
                <p className="eyebrow">Drug Database Matches</p>
                <h3>공식 DB 후보 확인</h3>
              </div>
        <div className="manual-search">
          <div className="search-input-wrap">
            <input
              aria-label="약 이름 직접 검색"
              onChange={(event) => setManualName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleManualSearch();
              }}
              placeholder="약 이름 직접 입력: 예) 타이레놀, 판콜, 오메가3"
              type="text"
              value={manualName}
            />
            {manualName && (
              <button
                aria-label="검색어 지우기"
                className="search-clear-button"
                onClick={() => {
                  resetSearchArtifacts();
                  setProgress("");
                }}
                type="button"
              >
                ×
              </button>
            )}
          </div>
          <button className="primary-button" disabled={isProcessing} onClick={() => void handleManualSearch()} type="button">
            약DB 검색
          </button>
        </div>
        <div className="scan-status">
          <strong>{isProcessing ? "처리 중" : "상태"}</strong>
          <span>{progress || "검색 결과와 저장 상태가 여기에 표시됩니다."}</span>
        </div>
        <div className="registration-options">
          <label>
            복용량
            <input
              onChange={(event) => setRegistrationDosage(event.target.value)}
              placeholder="예) 1정, 1캡슐"
              value={registrationDosage}
            />
          </label>
          <label>
            복용법
            <input
              onChange={(event) => setRegistrationInstructions(event.target.value)}
              placeholder="예) 아침 식후, 필요 시"
              value={registrationInstructions}
            />
          </label>
          <label>
            장기복용 검토일
            <input
              onChange={(event) => setRegistrationReviewAt(event.target.value)}
              type="date"
              value={registrationReviewAt}
            />
          </label>
        </div>
            </div>

            {activeRegistrationMode === "photo" && (
              <div className="ocr-result-card inline-ocr-card">
                <div className="section-heading">
                  <p className="eyebrow">인식 결과</p>
                  <h3>OCR 결과와 후보</h3>
                </div>
                <textarea
                  aria-label="OCR 원문"
                  onChange={(event) => setOcrText(event.target.value)}
                  placeholder="OCR 결과가 여기에 표시됩니다. 잘못 인식된 약명은 직접 수정할 수 있습니다."
                  rows={5}
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
              </div>
            )}

            <div className="db-match-card inline-db-card">
        <div className="match-toolbar">
          <div>
            <strong>검색 후보 {filteredMatches.length}개</strong>
            {filteredMatches.length > visibleMatches.length && (
              <span className="match-count-copy">현재 {visibleMatches.length}개 표시 중</span>
            )}
            {matches.length >= MATCH_RESULT_LIMIT && (
              <span className="match-count-copy">관련도 높은 후보를 최대 {MATCH_RESULT_LIMIT}개까지 불러왔습니다.</span>
            )}
          </div>
          <div className="source-filter-list">
            <button
              className={sourceFilter === "all" ? "source-filter active" : "source-filter"}
              onClick={() => changeSourceFilter("all")}
              type="button"
            >
              전체
            </button>
            {sourceOptions.map((source) => (
              <button
                className={sourceFilter === source ? "source-filter active" : "source-filter"}
                key={source}
                onClick={() => changeSourceFilter(source)}
                type="button"
              >
                {sourceLabel(source)}
              </button>
            ))}
          </div>
        </div>
        <div className="match-grid">
          {visibleMatches.map((match) => {
            const isRegistered = registeredMedicationKeys.has(medicationKey(match.source, match.productName));
            const isThisSaving = savingMatchId === match.id;

            return (
              <article className={isRegistered ? "match-card already-registered" : "match-card"} key={match.id}>
                <div>
                  <span className="source-badge">{sourceLabel(match.source)}</span>
                  <strong>{match.productName}</strong>
                  <p>{match.manufacturer || "제조사 정보 없음"} · 신뢰도 {Math.round(match.confidence * 100)}%</p>
                  <p>{ingredientSummary(match.ingredients)}</p>
                  {match.efficacy && <p>{match.efficacy}</p>}
                </div>
                <button className="primary-button" disabled={isSaving} onClick={() => confirmMatch(match)} type="button">
                  {isThisSaving ? "저장 중..." : isRegistered ? "등록 정보 갱신" : "이 약으로 등록"}
                </button>
              </article>
            );
          })}
        </div>
        {hasMoreMatches && (
          <div className="match-more-row">
            <button
              className="ghost-button"
              onClick={() => setMatchDisplayCount((count) => count + MATCH_PAGE_SIZE)}
              type="button"
            >
              후보 더 보기
            </button>
          </div>
        )}
        {!matches.length && (
          <p className="form-note empty-match-note">
            아직 공식 DB 후보가 없습니다. 검색어를 바꾸거나 아래에서 약명과 성분을 직접 입력해 저장할 수 있습니다.
          </p>
        )}
        {matches.length > 0 && !visibleMatches.length && (
          <p className="form-note">선택한 출처에 맞는 후보가 없습니다. 출처 필터를 전체로 바꿔 주세요.</p>
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
          <button className="temporary-button" disabled={isSaving} onClick={saveTemporary} type="button">
            {isSaving ? "저장 중..." : "임시약으로 저장"}
          </button>
        </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function dedupeMatches(matches: DrugDatabaseMatch[]): DrugDatabaseMatch[] {
  return Array.from(new Map(matches.map((match) => [match.id, match])).values());
}

function medicationKey(source: DrugDatabaseMatch["source"], productName: string): string {
  return `${source}:${productName.trim().toLocaleLowerCase("ko-KR")}`;
}
