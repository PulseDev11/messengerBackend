export const MIN_SUPPORTED_APP_VERSION = "1.0.3";

// Returns true if `version` is strictly less than `minVersion`.
// Missing/unparsable version is treated as "less than" (i.e. old).
export const isVersionBelow = (version: string | undefined, minVersion: string): boolean => {
    if (!version) return true;
    const a = version.split(".").map((n) => parseInt(n, 10) || 0);
    const b = minVersion.split(".").map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const ai = a[i] ?? 0;
        const bi = b[i] ?? 0;
        if (ai !== bi) return ai < bi;
    }
    return false;
};
