const fs = require('fs');
let code = fs.readFileSync('src/hooks/useDashboard.ts', 'utf8');

// 1. Add new filters to state
code = code.replace(
  /const \[endDate, setEndDate\] = useState<string>\(\"\"\);/g,
  `const [endDate, setEndDate] = useState<string>("");\n  const [filterProvince, setFilterProvince] = useState<string>("ทั้งหมด");\n  const [filterAge, setFilterAge] = useState<string>("ทั้งหมด");\n  const [filterTrafficking, setFilterTrafficking] = useState<string>("ทั้งหมด");\n  const [filterStatus, setFilterStatus] = useState<string>("ทั้งหมด");`
);

// 2. Add to params
code = code.replace(
  /startDate, endDate,/g,
  'startDate, endDate,\n      province: filterProvince,\n      ageGroup: filterAge,\n      human_trafficking: filterTrafficking,\n      status: filterStatus,'
);

// 3. Add to dependency array
code = code.replace(
  /startDate, endDate, currentPage, sortField, sortDirection\]\);/g,
  'startDate, endDate, currentPage, sortField, sortDirection, filterProvince, filterAge, filterTrafficking, filterStatus]);'
);

// 4. Update resetFilters
code = code.replace(
  /setStartDate\(\"\"\); setEndDate\(\"\"\);/g,
  'setStartDate(""); setEndDate(""); setFilterProvince("ทั้งหมด"); setFilterAge("ทั้งหมด"); setFilterTrafficking("ทั้งหมด"); setFilterStatus("ทั้งหมด");'
);

// 5. Add to derived (metadata options)
code = code.replace(
  /const gendersOptions =.*?;/g,
  `const gendersOptions = Array.from(new Set(["ทั้งหมด", "ชาย", "หญิง", "ไม่ระบุ", ...(dashboardData?.meta?.allGenders || [])]));
  const provinceOptions = Array.from(new Set(["ทั้งหมด", "ไม่ระบุ", ...(dashboardData?.meta?.allProvinces || [])]));
  const ageOptions = ["ทั้งหมด", "0-18 ปี", "19-30 ปี", "31-50 ปี", "51 ปีขึ้นไป", "ไม่ระบุ"];
  const traffickingOptions = ["ทั้งหมด", "มีข้อบ่งชี้", "ไม่มีข้อบ่งชี้"];
  const statusOptions = ["ทั้งหมด", "พบตัวแล้ว", "ยังไม่พบตัว"];`
);

// 6. Format new charts
code = code.replace(
  /const genderChart = formatStandardChartData\(dashboardData\?\.charts\?\.gender, dashboardData\?\.stats\?\.total, 2\);/g,
  `const genderChart = formatStandardChartData(dashboardData?.charts?.gender, dashboardData?.stats?.total, 2);
  const provinceChart = formatStandardChartData(dashboardData?.charts?.province, dashboardData?.stats?.total, 3);
  const ageChart = formatStandardChartData(dashboardData?.charts?.ageGroup, dashboardData?.stats?.total, 4);
  const traffickingChart = formatStandardChartData(dashboardData?.charts?.humanTrafficking, dashboardData?.stats?.total, 5);
  const statusChart = formatStandardChartData(dashboardData?.charts?.status, dashboardData?.stats?.total, 1);
  const reportedDateChart = dashboardData?.charts?.reportedDateTrend?.map((d: any) => ({ ...d, color: "var(--blueText)" })) || [];`
);

// 7. Update return object
code = code.replace(
  /states: { filterNat, filterGender,/g,
  'states: { filterNat, filterGender, filterProvince, filterAge, filterTrafficking, filterStatus,'
);
code = code.replace(
  /actions: { handleFilterChange, handleSort, resetFilters, setCurrentPage, setFilterNat, setFilterGender, setStartDate, setEndDate },/g,
  'actions: { handleFilterChange, handleSort, resetFilters, setCurrentPage, setFilterNat, setFilterGender, setStartDate, setEndDate, setFilterProvince, setFilterAge, setFilterTrafficking, setFilterStatus },'
);
code = code.replace(
  /derived: { nationalitiesOptions, gendersOptions, tableRows,/g,
  'derived: { nationalitiesOptions, gendersOptions, provinceOptions, ageOptions, traffickingOptions, statusOptions, provinceChart, ageChart, traffickingChart, statusChart, reportedDateChart, tableRows,'
);

fs.writeFileSync('src/hooks/useDashboard.ts', code);
console.log('useDashboard.ts updated successfully.');
