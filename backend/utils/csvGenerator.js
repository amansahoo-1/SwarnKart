import { stringify } from "csv-stringify/sync";
import fs from "fs/promises";

/**
 * Generates a CSV file from the provided data
 * @param {Object[]} data - Array of objects to convert to CSV
 * @param {string} filename - Name of the output file (without .csv extension)
 * @param {Object} [options] - Optional configuration
 * @param {string} [options.directory='exports'] - Output directory
 * @param {boolean} [options.headers=true] - Include headers in CSV
 * @returns {Promise<string>} - Path to the generated CSV file
 */
export const generateCSV = async (data, filename, options = {}) => {
  const { directory = "exports", headers = true } = options;

  // Create directory if it doesn't exist
  await fs.mkdir(directory, { recursive: true });

  // Generate CSV content
  const csvContent = stringify(data, {
    header: headers,
    columns: headers ? Object.keys(data[0] || {}) : undefined,
    delimiter: ",",
    quoted: true,
  });

  // Write to file
  const filePath = `${directory}/${filename}.csv`;
  await fs.writeFile(filePath, csvContent);

  return filePath;
};

/**
 * Generates CSV content without saving to file
 * @param {Object[]} data - Array of objects to convert to CSV
 * @param {boolean} [includeHeaders=true] - Whether to include headers
 * @returns {string} - CSV formatted string
 */
export const generateCSVContent = (data, includeHeaders = true) => {
  return stringify(data, {
    header: includeHeaders,
    columns: includeHeaders ? Object.keys(data[0] || {}) : undefined,
    delimiter: ",",
    quoted: true,
  });
};
