import ExcelJS from "exceljs";

export const generateExcel = async (data, type) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(type);

  // Add headers
  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);

    // Add data
    data.forEach((item) => {
      const row = headers.map((header) => item[header]);
      worksheet.addRow(row);
    });
  }

  // Generate buffer
  return await workbook.xlsx.writeBuffer();
};

export const generateCSV = (data) => {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  let csv = headers.join(",") + "\n";

  data.forEach((item) => {
    const row = headers
      .map((header) => {
        const value = item[header];
        return typeof value === "string"
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      })
      .join(",");
    csv += row + "\n";
  });

  return csv;
};
