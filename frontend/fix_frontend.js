const fs = require('fs');

let pageContent = fs.readFileSync('src/app/missing/create/page.tsx', 'utf8');
pageContent = pageContent.replace(/officer_first_name:\s*"",/g, 'officer_name: "",');
pageContent = pageContent.replace(/officer_last_name:\s*"",\n/g, '');
pageContent = pageContent.replace(/<div><label className=\{labelClass\}>ชื่อพนักงานสอบสวน<\/label><input type="text" name="officer_first_name".*?<\/div>/, '<div className="col-span-1 md:col-span-2"><label className={labelClass}>ชื่อพนักงานสอบสวน/ตำรวจ (ไม่ต้องมียศ)</label><input type="text" name="officer_name" value={formData.officer_name} onChange={handleInputChange} className={inputClass} /></div>');
pageContent = pageContent.replace(/<div><label className=\{labelClass\}>นามสกุลพนักงานสอบสวน<\/label><input type="text" name="officer_last_name".*?<\/div>\n?/g, '');
fs.writeFileSync('src/app/missing/create/page.tsx', pageContent);

let formContent = fs.readFileSync('src/components/missing/MissingEditForm.tsx', 'utf8');
formContent = formContent.replace(/officer_first_name:\s*missingPerson\.officer_first_name\s*\|\|\s*"",/g, 'officer_name: missingPerson.officer_name || "",');
formContent = formContent.replace(/officer_last_name:\s*missingPerson\.officer_last_name\s*\|\|\s*"",\n/g, '');
formContent = formContent.replace(/<div><label className=\{labelClass\}>ชื่อพนักงานสอบสวน<\/label><input type="text" name="officer_first_name".*?<\/div>/, '<div className="col-span-1 md:col-span-2"><label className={labelClass}>ชื่อพนักงานสอบสวน/ตำรวจ (ไม่ต้องมียศ)</label><input type="text" name="officer_name" value={formData.officer_name} onChange={handleInputChange} className={inputClass} /></div>');
formContent = formContent.replace(/<div><label className=\{labelClass\}>นามสกุลพนักงานสอบสวน<\/label><input type="text" name="officer_last_name".*?<\/div>\n?/g, '');
fs.writeFileSync('src/components/missing/MissingEditForm.tsx', formContent);

let rightPanel = fs.readFileSync('src/components/missing/RightPanel.tsx', 'utf8');
rightPanel = rightPanel.replace(/<InfoRow label="ชื่อพนักงานสอบสวน" value=\{data\.officer_first_name\} \/>/, '<InfoRow label="ชื่อพนักงานสอบสวน/ตำรวจ" value={data.officer_name} />');
rightPanel = rightPanel.replace(/<InfoRow label="นามสกุลพนักงานสอบสวน" value=\{data\.officer_last_name\} \/>\n?/g, '');
fs.writeFileSync('src/components/missing/RightPanel.tsx', rightPanel);

