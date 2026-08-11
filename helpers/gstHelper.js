const normalizeSize = (size) => {
  if (size === null || size === undefined) return "";
  return String(size).trim().toLowerCase().replace(/\s+/g, "");
};

// 26 KG → GST 0%
const isZeroGstSize = (size) => {
  const value = normalizeSize(size);
  return value === "26" || value === "26kg";
};

// 5 KG / 10 KG → GST 5%
const isStandardGstSize = (size) => {
  const value = normalizeSize(size);
  return value === "5" || value === "5kg" || value === "10" || value === "10kg";
};

module.exports = { normalizeSize, isZeroGstSize, isStandardGstSize };
