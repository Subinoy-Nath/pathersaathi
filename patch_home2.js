const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/HomeClient.tsx', 'utf8');

// Fix 1: Fare multiplication
code = code.replace(
  '<div className="text-xl font-bold text-[#00342b]">₹{schedule.base_fare}</div>',
  '<div className="text-xl font-bold text-[#00342b]">₹{(schedule.base_fare || 0) * parseInt(searchParams.seats || "1")}</div>'
);

// Fix 2: Default date
// We'll calculate the date string properly for local timezone
const dateCode = `
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return \`\${year}-\${month}-\${day}\`;
  };

  const [searchParams, setSearchParams] = useState({ seats: '1', travelDate: getTodayString() });`;

code = code.replace(
  "const [searchParams, setSearchParams] = useState({ seats: '1', travelDate: '' });",
  dateCode
);

// Also need to set the default value of the date input so it shows visually
code = code.replace(
  'name="travelDate"\n                      required\n                      className="w-full pl-10 pr-4 py-3 bg-[#f8fafb] border border-[#bfc9c4] rounded-xl outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]"',
  'name="travelDate"\n                      required\n                      defaultValue={getTodayString()}\n                      className="w-full pl-10 pr-4 py-3 bg-[#f8fafb] border border-[#bfc9c4] rounded-xl outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]"'
);

fs.writeFileSync('frontend/src/app/HomeClient.tsx', code);
