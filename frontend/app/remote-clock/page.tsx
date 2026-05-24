"use client";

import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock3,
  IdCard,
  LocateFixed,
  LogIn,
  Shield,
  X
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/brand";
import {
  buildRemoteClockFilename,
  employeeFullName,
  formatCoordinates,
  isClockableEmployee,
  lookupRemoteClockEmployee,
  resolveRemoteClockAddress,
  submitRemoteClock,
  type RemoteClockAction,
  type RemoteClockEmployee
} from "@/lib/remote-clock";

type FaceApi = typeof import("@vladmandic/face-api");
type LocationStatus = "unknown" | "prompt" | "granted" | "denied";
type Message = { type: "success" | "error" | "info"; text: string };

export default function RemoteClockPage() {
  const [employeeCode, setEmployeeCode] = useState("");
  const [employee, setEmployee] = useState<RemoteClockEmployee | null>(null);
  const [clockActionModalOpen, setClockActionModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [location, setLocation] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("unknown");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [isCapturing, setIsCapturing] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [captureDateTime, setCaptureDateTime] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [submitting, setSubmitting] = useState<RemoteClockAction | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceApiRef = useRef<FaceApi | null>(null);
  const detectionTimerRef = useRef<number | null>(null);
  const isCapturingRef = useRef(false);

  useEffect(() => {
    const update = () => setCurrentTime(formatManilaTime());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!message || message.type === "info") {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage(null);
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!("permissions" in navigator)) {
      return;
    }

    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((permission) => {
        setLocationStatus(permission.state as LocationStatus);
        permission.onchange = () => setLocationStatus(permission.state as LocationStatus);
        if (permission.state === "granted") {
          requestLocation().catch(() => undefined);
        }
      })
      .catch(() => setLocationStatus("unknown"));
  }, []);

  const lookupEmployee = useCallback(async (code: string) => {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setEmployee(null);
      return;
    }

    setLookupLoading(true);
    setMessage(null);
    try {
      const foundEmployee = await lookupRemoteClockEmployee(trimmedCode);
      setEmployee(foundEmployee);
      if (!isClockableEmployee(foundEmployee)) {
        setMessage({ type: "error", text: "This employee is not active for remote clock." });
      }
    } catch (error) {
      setEmployee(null);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Employee not found." });
    } finally {
      setLookupLoading(false);
    }
  }, []);

  const stopMedia = useCallback(() => {
    isCapturingRef.current = false;
    if (detectionTimerRef.current) {
      window.clearInterval(detectionTimerRef.current);
      detectionTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    const context = canvasRef.current?.getContext("2d");
    if (canvasRef.current && context) {
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setIsCapturing(false);
    setFaceDetected(false);
  }, []);

  useEffect(() => {
    return () => stopMedia();
  }, [stopMedia]);

  const startFaceDetection = useCallback(() => {
    const faceapi = faceApiRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!faceapi || !video || !canvas) {
      return;
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const displaySize = { width, height };
    faceapi.matchDimensions(canvas, displaySize);

    if (detectionTimerRef.current) {
      window.clearInterval(detectionTimerRef.current);
    }

    detectionTimerRef.current = window.setInterval(async () => {
      if (!faceApiRef.current || !videoRef.current || !canvasRef.current) {
        return;
      }
      if (!isCapturingRef.current) {
        return;
      }

      const api = faceApiRef.current;
      const videoEl = videoRef.current;
      const canvasEl = canvasRef.current;
      if (!api || !videoEl || !canvasEl) {
        return;
      }
      if (videoEl.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return;
      }
      if (!videoEl.videoWidth || !videoEl.videoHeight) {
        return;
      }

      try {
        const detections = await api.detectAllFaces(videoEl, new api.TinyFaceDetectorOptions()).withFaceLandmarks();
        const validDetections = detections.filter(hasValidDetectionBox);
        const context = canvasEl.getContext("2d");
        context?.clearRect(0, 0, canvasEl.width, canvasEl.height);
        if (validDetections.length > 0) {
          const resized = api.resizeResults(validDetections, displaySize);
          api.draw.drawDetections(canvasEl, resized);
          api.draw.drawFaceLandmarks(canvasEl, resized);
        }
        setFaceDetected(validDetections.length > 0);
      } catch {
        // Face-api can intermittently emit invalid box values while camera frames are settling.
        // Swallow and continue polling instead of throwing unhandled promise rejections.
        setFaceDetected(false);
      }
    }, 180);
  }, []);

  useEffect(() => {
    if (!isCapturing || !streamRef.current || !videoRef.current || !faceApiRef.current) {
      return;
    }

    const videoEl = videoRef.current;
    videoEl.srcObject = streamRef.current;

    const onLoaded = () => startFaceDetection();
    videoEl.addEventListener("loadedmetadata", onLoaded, { once: true });
    videoEl.play().catch(() => {
      setMessage({ type: "error", text: "Unable to start camera preview." });
      stopMedia();
    });

    return () => videoEl.removeEventListener("loadedmetadata", onLoaded);
  }, [isCapturing, startFaceDetection, stopMedia]);

  async function loadFaceModels() {
    if (faceApiRef.current) {
      return;
    }

    setModelStatus("loading");
    try {
      const faceapi = await import("@vladmandic/face-api");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models")
      ]);
      faceApiRef.current = faceapi;
      setModelStatus("ready");
    } catch {
      setModelStatus("error");
      throw new Error("Face detection models could not be loaded.");
    }
  }

  async function requestLocation() {
    const host = window.location.hostname;
    const isLoopbackHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
    const hasSecureOrigin = window.isSecureContext || isLoopbackHost;
    if (!hasSecureOrigin) {
      setLocationStatus("denied");
      throw new Error(
        `Location requires HTTPS on mobile browsers. Current origin (${window.location.origin}) is not secure.`
      );
    }

    if (!navigator.geolocation) {
      setLocationStatus("denied");
      throw new Error("Geolocation is not supported by this browser.");
    }

    const point = await new Promise<string>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const formatted = formatCoordinates(position.coords);
          setLocation(formatted);
          setLocationAddress("Resolving address...");
          setLocationStatus("granted");
          resolveRemoteClockAddress(formatted)
            .then((address) => {
              setLocationAddress(looksLikeCoordinates(address) ? "Address unavailable" : address);
            })
            .catch(() => {
              setLocationAddress("Address unavailable");
            });
          resolve(formatted);
        },
        (error) => {
          setLocationStatus("denied");
          reject(new Error(geolocationErrorMessage(error)));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
      );
    });

    return point;
  }

  async function startCapture() {
    setMessage(null);
    if (!employee) {
      setMessage({ type: "error", text: "Enter a valid employee code first." });
      return;
    }
    if (!isClockableEmployee(employee)) {
      setMessage({ type: "error", text: "Only active employees can use remote clock." });
      return;
    }

    try {
      if (!location) {
        await requestLocation();
      } else if (!locationAddress) {
        resolveRemoteClockAddress(location)
          .then((address) => {
            setLocationAddress(looksLikeCoordinates(address) ? "Address unavailable" : address);
          })
          .catch(() => {
            setLocationAddress("Address unavailable");
          });
      }
      await loadFaceModels();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      isCapturingRef.current = true;
      setClockActionModalOpen(false);
      setPhotoFile(null);
      setPhotoPreview("");
      setIsCapturing(true);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to start capture." });
      stopMedia();
    }
  }

  async function takePhoto() {
    const videoEl = videoRef.current;
    if (!videoEl || !employee) {
      return;
    }

    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = videoEl.videoWidth || 960;
    captureCanvas.height = videoEl.videoHeight || 720;
    captureCanvas.getContext("2d")?.drawImage(videoEl, 0, 0, captureCanvas.width, captureCanvas.height);
    const preview = captureCanvas.toDataURL("image/png");
    const file = await new Promise<File>((resolve, reject) => {
      captureCanvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Unable to capture photo."));
          return;
        }
        resolve(new File([blob], buildRemoteClockFilename(employee.id), { type: "image/png" }));
      }, "image/png");
    });

    setPhotoPreview(preview);
    setPhotoFile(file);
    setCaptureDateTime(new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" }));
    stopMedia();
    setClockActionModalOpen(true);
    setMessage({ type: "success", text: "Photo captured. Choose clock action." });
  }

  async function recordTime(action: RemoteClockAction) {
    if (!employee || !photoFile) {
      setMessage({ type: "error", text: "Capture a photo before recording time." });
      return;
    }

    setSubmitting(action);
    setMessage(null);
    try {
      const currentLocation = location || (await requestLocation());
      await submitRemoteClock(action, {
        employeeId: employee.id,
        location: currentLocation,
        image: photoFile
      });
      setClockActionModalOpen(false);
      setMessage({ type: "success", text: action === "time-in" ? "Time in successful." : "Time out successful." });
      setPhotoFile(null);
      setPhotoPreview("");
      setCaptureDateTime("");
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to record time." });
    } finally {
      setSubmitting(null);
    }
  }

  function resetVerification() {
    stopMedia();
    setEmployee(null);
    setPhotoFile(null);
    setPhotoPreview("");
    setCaptureDateTime("");
    setLocation("");
    setLocationAddress("");
    setClockActionModalOpen(false);
    setMessage(null);
  }

  return (
    <main className="min-h-screen bg-[#f4f6fb] font-['IBM_Plex_Sans',Inter,sans-serif] text-[#1b1b1d]">
      {message ? (
        <div className="pointer-events-none fixed left-1/2 top-6 z-50 w-[min(92vw,560px)] -translate-x-1/2">
          <div className={toastClass(message.type)}>
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        </div>
      ) : null}

      <div className="grid min-h-screen lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative hidden overflow-hidden lg:block">
          <img
            src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1900&q=80"
            alt="Team working together in an office"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b1324]/86 via-[#13203c]/76 to-[#1c2d55]/66" />
          <div className="absolute inset-x-0 bottom-0 px-12 pb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/90">{APP_NAME}</p>
            <h1 className="mt-4 max-w-xl font-slab text-5xl font-bold leading-[1.02] text-white">Remote Clock</h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-blue-50/90">
              Check in or check out quickly with live photo capture and location verification.
            </p>
          </div>
        </section>

        <section className="relative flex items-start justify-center px-4 pb-6 pt-5 sm:px-6 sm:pb-8 sm:pt-6 lg:px-10 lg:pt-8">
          <Link
            href="/login"
            aria-label="Go to sign in"
            className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-ink sm:right-5 sm:top-5"
          >
            <LogIn className="h-4 w-4" />
            Sign in
          </Link>

          <div className="w-full max-w-[620px] space-y-5">
            <div className="pr-14 sm:pr-16">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">{APP_NAME}</p>
              <h2 className="mt-2 font-slab text-[30px] font-bold leading-9 text-ink sm:text-[36px] sm:leading-10">Remote Clock</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Enter your code to continue.</p>
            </div>

            <article className="rounded-2xl border border-line bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="mb-8 text-center">
                <p className="font-mono text-[42px] font-semibold leading-none text-[#0f172a] sm:text-[54px]">{currentTime}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.3em] text-[#5f6472]">Current Time</p>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#525866]">Employee Code</span>
                  <div className="relative">
                    <IdCard className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#76777d]" />
                    <Input
                      className="h-14 rounded-lg border-[#c6c6cd] bg-white pl-12 text-[17px] font-medium leading-7 placeholder:text-[#9ca3af] focus:border-[#0051d5] focus:ring-4 focus:ring-[#0051d5]/12"
                      placeholder="Enter code"
                      value={employeeCode}
                      onChange={(event) => setEmployeeCode(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          lookupEmployee(employeeCode).catch(() => undefined);
                        }
                      }}
                    />
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() => lookupEmployee(employeeCode)}
                  disabled={lookupLoading || !employeeCode.trim()}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#0051d5] text-[16px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {lookupLoading ? "Finding..." : "Find"}
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </article>

            {employee ? (
              <article className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                <div className={employeeStatusBadgeClass(employee.status)}>
                  {employeeStatusIcon(employee.status)}
                  <span>{employeeStatusLabel(employee.status)}</span>
                </div>
                <div className="p-6">
                  <div className="flex flex-col items-center gap-6">
                    <div className="h-32 w-32 overflow-hidden rounded-xl border border-[#c6c6cd] bg-[#f0edef] shadow-sm">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Captured employee" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-[#565e74]">
                          {initials(employeeFullName(employee))}
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <h3 className="text-[32px] leading-none sm:text-[46px]">{employeeFullName(employee)}</h3>
                      <p className="mt-2 text-[16px] leading-6 text-[#45464d] sm:text-[18px] sm:leading-7">{employee.position || "Staff"}</p>
                    </div>

                    <div className="grid w-full grid-cols-1 gap-4">
                      <div className="rounded-lg border border-[#c6c6cd]/50 bg-[#f6f3f5] p-4 text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#76777d]">Store</p>
                        <p className="mt-2 text-[23px] leading-none sm:text-[30px]">{employee.store?.area || employee.store?.name || "Unassigned"}</p>
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-4">
                      <button
                        type="button"
                        onClick={resetVerification}
                        className="h-12 flex-1 rounded-lg border border-[#76777d] bg-white text-[16px] font-semibold text-[#1b1b1d] transition hover:bg-[#f6f3f5]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => startCapture().catch(() => undefined)}
                        disabled={submitting !== null || isCapturing || !isClockableEmployee(employee)}
                        className="h-12 flex-[2] rounded-lg bg-black px-5 text-[16px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {photoFile ? "Retake capture" : "Start capture"}
                      </button>
                    </div>

                    {photoFile ? (
                      <button
                        type="button"
                        onClick={() => setClockActionModalOpen(true)}
                        disabled={submitting !== null}
                        className="h-11 w-full rounded-lg border border-[#0051d5] bg-white text-[16px] font-semibold text-[#0051d5] transition hover:bg-[#0051d5]/5 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Open clock action
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ) : null}

            <div className="flex flex-col gap-2 rounded-lg border border-line bg-white px-4 py-3 text-xs text-[#45464d] sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-1 font-semibold">
                <Shield className="h-3.5 w-3.5" />
                Live location
              </span>
              <button
                type="button"
                onClick={() => requestLocation().catch((error) => setMessage({ type: "error", text: error.message }))}
                className="inline-flex items-center gap-1 font-medium text-[#0051d5]"
              >
                <LocateFixed className="h-3.5 w-3.5" />
                Detect
              </button>
            </div>
          </div>
        </section>
      </div>

      {isCapturing ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1b1b1d]/45 p-4">
          <article className="w-full max-w-[920px] rounded-xl border border-[#c6c6cd] bg-white p-4 shadow-[0_20px_40px_rgba(15,23,42,0.2)] sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#45464d]">
                <Camera className="h-4 w-4" />
                Photo capture
              </div>
              <button
                type="button"
                onClick={stopMedia}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#76777d] transition hover:bg-[#f6f3f5] hover:text-[#1b1b1d]"
                aria-label="Close photo capture modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative overflow-hidden rounded-lg border border-[#c6c6cd] bg-black">
              <video ref={videoRef} className="h-[48vh] min-h-[240px] w-full object-cover sm:h-[58vh] sm:min-h-[320px]" autoPlay muted playsInline />
              <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-[#45464d]">{faceDetected ? "Face detected" : "Waiting for face"}</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={stopMedia}>
                  Cancel
                </Button>
                <Button icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => takePhoto().catch(() => undefined)} disabled={!faceDetected}>
                  Capture photo
                </Button>
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {clockActionModalOpen && employee && photoFile ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1b1b1d]/40 p-4">
          <div className="w-full max-w-[460px] overflow-hidden rounded-xl border border-[#c6c6cd] bg-white shadow-[0_20px_40px_rgba(15,23,42,0.2)]">
            <div className="flex items-center justify-between border-b border-[#c6c6cd] px-5 py-4">
              <h3 className="text-xl font-semibold text-[#1b1b1d]">Clock action</h3>
              <button
                type="button"
                onClick={() => setClockActionModalOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#76777d] transition hover:bg-[#f6f3f5] hover:text-[#1b1b1d]"
                aria-label="Close clock action modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <p className="text-lg font-semibold text-[#1b1b1d]">{employeeFullName(employee)}</p>
              <div className="overflow-hidden rounded-lg border border-[#c6c6cd] bg-[#f6f3f5]">
                <img src={photoPreview} alt="Clock evidence" className="aspect-video w-full object-cover" />
              </div>
              <div className="grid gap-2 text-sm text-[#45464d]">
                <p>
                  <span className="font-semibold text-[#1b1b1d]">Date Time:</span> {captureDateTime || "-"}
                </p>
                <p className="break-all">
                  <span className="font-semibold text-[#1b1b1d]">Location:</span> {locationDisplay(locationAddress, locationStatus)}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  className="h-11 rounded-md"
                  onClick={() => recordTime("time-in").catch(() => undefined)}
                  disabled={submitting !== null}
                >
                  {submitting === "time-in" ? "Recording..." : "Clock In"}
                </Button>
                <Button
                  variant="danger"
                  className="h-11 rounded-md"
                  onClick={() => recordTime("time-out").catch(() => undefined)}
                  disabled={submitting !== null}
                >
                  {submitting === "time-out" ? "Recording..." : "Clock Out"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function formatManilaTime() {
  return new Date().toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Manila"
  });
}

function locationStatusText(status: LocationStatus) {
  if (status === "denied") {
    return "Location permission denied";
  }
  if (status === "prompt") {
    return "Location permission required";
  }
  if (status === "granted") {
    return "Resolving address";
  }
  return "Location not checked";
}

function locationDisplay(address: string, status: LocationStatus) {
  const normalized = address.trim();
  if (normalized) {
    return normalized;
  }
  return locationStatusText(status);
}

function toastClass(type: Message["type"]) {
  if (type === "success") {
    return "rounded-lg border border-[#8fd7b4] bg-[#e9fff2] px-4 py-3 text-sm font-medium text-[#0f6d42]";
  }
  if (type === "error") {
    return "rounded-lg border border-[#f5aaa3] bg-[#fff0ef] px-4 py-3 text-sm font-medium text-[#ba1a1a]";
  }
  return "rounded-lg border border-[#c6c6cd] bg-white px-4 py-3 text-sm font-medium text-[#45464d]";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function employeeStatusLabel(status: string) {
  const normalized = status.trim().toUpperCase();
  if (normalized === "AWOL") {
    return "AWOL";
  }
  return normalized
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function employeeStatusBadgeClass(status: string) {
  const normalized = status.trim().toUpperCase();
  const base = "absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.03em]";

  if (normalized === "ACTIVE") {
    return `${base} border-[#8fd7b4] bg-[#e9fff2] text-[#0f6d42]`;
  }
  if (normalized === "INACTIVE") {
    return `${base} border-[#d2d6dc] bg-[#f3f4f6] text-[#4b5563]`;
  }
  if (normalized === "AWOL") {
    return `${base} border-[#f5aaa3] bg-[#fff0ef] text-[#ba1a1a]`;
  }
  return `${base} border-[#b4c5ff] bg-[#edf2ff] text-[#003ea8]`;
}

function employeeStatusIcon(status: string) {
  const normalized = status.trim().toUpperCase();
  if (normalized === "ACTIVE") {
    return <CheckCircle2 className="h-3.5 w-3.5" />;
  }
  if (normalized === "INACTIVE") {
    return <Clock3 className="h-3.5 w-3.5" />;
  }
  return <AlertCircle className="h-3.5 w-3.5" />;
}

function geolocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission denied. Allow location access in browser settings and try again.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Unable to determine device location. Check GPS/Wi-Fi and try again.";
  }
  if (error.code === error.TIMEOUT) {
    return "Location request timed out. Move to an open area and retry.";
  }
  return error.message || "Unable to retrieve location.";
}

function looksLikeCoordinates(value: string) {
  return /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(value.trim());
}

function hasValidDetectionBox(detection: unknown) {
  const box = (detection as {
    detection?: {
      box?: { x?: unknown; y?: unknown; width?: unknown; height?: unknown };
    };
  })?.detection?.box;

  return Boolean(
    box &&
      isFiniteNumber(box.x) &&
      isFiniteNumber(box.y) &&
      isFiniteNumber(box.width) &&
      isFiniteNumber(box.height) &&
      box.width > 0 &&
      box.height > 0
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
