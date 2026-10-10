const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/HomeClient.tsx', 'utf8');

code = code.replace(
  '<span className="font-bold text-[#00342b] text-base">{busName}</span>',
  '<span className="font-bold text-[#00342b] text-base">{busName} {schedule.vehicles?.is_ac ? <span className="text-[10px] px-1 py-0.5 bg-blue-100 text-blue-800 rounded">AC</span> : <span className="text-[10px] px-1 py-0.5 bg-gray-100 text-gray-800 rounded">Non-AC</span>}</span>'
);

code = code.replace(
  '<h4 className="font-bold text-[#00342b] text-lg">{busName}</h4>',
  '<h4 className="font-bold text-[#00342b] text-lg flex items-center gap-2">{busName} {schedule.vehicles?.is_ac ? <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">AC</span> : <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded">Non-AC</span>}</h4>'
);

fs.writeFileSync('frontend/src/app/HomeClient.tsx', code);
