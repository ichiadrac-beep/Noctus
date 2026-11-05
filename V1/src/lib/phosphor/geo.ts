import type { Place } from "@/lib/phosphor/store";

export function placeFromLocale(): Place {
  const tag = typeof navigator === "undefined" ? "en" : navigator.language || "en";
  const region =
    tag
      .split("-")
      .map((part) => part.toUpperCase())
      .find((part) => /^[A-Z]{2}$/.test(part)) ?? "";
  let country = "";
  if (region) {
    try {
      country = new Intl.DisplayNames(["en"], { type: "region" }).of(region) || region;
    } catch {
      country = region;
    }
  }
  return {
    city: "",
    country,
    countryCode: region,
    source: region ? "locale" : "unknown",
    lat: null,
    lon: null,
  };
}

type ReverseGeo = {
  countryCode?: string;
  countryName?: string;
  city?: string;
  locality?: string;
  principalSubdivision?: string;
};

export async function locateGps(): Promise<Place> {
  if (!navigator.geolocation) {
    throw new Error("This phone has no location service.");
  }
  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 120000,
    });
  });
  const { latitude, longitude } = pos.coords;
  const url =
    "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" +
    encodeURIComponent(String(latitude)) +
    "&longitude=" +
    encodeURIComponent(String(longitude)) +
    "&localityLanguage=en";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Country lookup failed. Pick a lexicon.");
  const data = (await res.json()) as ReverseGeo;
  const countryCode = (data.countryCode || "").toUpperCase();
  return {
    city: data.city || data.locality || data.principalSubdivision || "",
    country: data.countryName || countryCode,
    countryCode,
    source: "gps",
    lat: latitude,
    lon: longitude,
  };
}

export function geoErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = Number((err as { code: number }).code);
    if (code === 1) return "Location blocked. Pick a lexicon, or allow location and try again.";
    if (code === 2) return "Location unavailable. Pick a lexicon.";
    if (code === 3) return "Location timed out. Try again or pick a lexicon.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Could not read location.";
}

export function placeLabel(place: Place): string {
  if (place.source === "gps") {
    return [place.city, place.country].filter(Boolean).join(", ") || "Location found";
  }
  if (place.country) return `${place.country} · phone region`;
  return "Location off";
}
