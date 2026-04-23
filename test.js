const xlsx = require('xlsx');
const workbook = xlsx.readFile('C:/Users/fvegi/test.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);
console.log(Object.keys(data[0]));
console.log(data[0]);
