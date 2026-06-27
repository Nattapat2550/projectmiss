export async function getRepatriateData(
	page: number = 0,
	limit: number = 25
): Promise<{
	data: any[]; 
	total: number;
}> {
	try {
		const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
		const response = await fetch(`${backendUrl}/api/v1/immigrants`, {
			cache: 'no-store'
		});

		if (!response.ok) {
			throw new Error("Failed to fetch repatriate data");
		}

		const result = await response.json();
		const rawData = result.data?.repatriateds || [];

		// Map ข้อมูลให้ตรงกับ UI
		const mappedData = rawData.map((item: any) => {
			
			// ✨ จัดการแปลงวันเกิด (รองรับทั้งแบบ String เดิม และ Date แบบใหม่ที่แก้ล่าสุด)
			let birth_day = 1, birth_month = 0, birth_year = 2000;
			
			if (item.date_of_birth) {
				if (typeof item.date_of_birth === 'string' && item.date_of_birth.includes('/')) {
					// แบบเก่า
					const parts = item.date_of_birth.split('/');
					birth_day = parseInt(parts[0]) || 1;
					birth_month = (parseInt(parts[1]) || 1) - 1; 
					birth_year = parseInt(parts[2]) || 2000;
					if (birth_year > 2500) birth_year -= 543; 
				} else {
					// แบบใหม่ (DATE type ของ DB จะออกมาเป็น ISO String / Date Object)
					const d = new Date(item.date_of_birth);
					if (!isNaN(d.getTime())) {
						birth_day = d.getDate();
						birth_month = d.getMonth();
						birth_year = d.getFullYear();
					}
				}
			}

			return {
				id: item.id,
				first_name_th: item.first_name_th || "ไม่ระบุ",
				middle_name_th: item.middle_name_th || null,
				last_name_th: item.last_name_th || "ไม่ระบุ",
				first_name_en: item.first_name_en || null,
				middle_name_en: item.middle_name_en || null,
				last_name_en: item.last_name_en || null,
				
				gender: item.gender === "หญิง" ? "female" : "male", 
				
				national_id: item.national_id || "ไม่ระบุ",
				passport_id: item.passport_id || null,
				
				birth_day,
				birth_month,
				birth_year,
				
				address: item.address || "ไม่ระบุ",
				image_url: item.photo_url || null, 
				
				number_of_case: item.number_of_case || 0,
				number_of_warrant: item.number_of_warrant || 0,
				
				is_victim: item.victim_indicator ? item.victim_indicator.includes("มีข้อบ่งชี้") : null,
			};
		});

		const offset = page * limit;
		return {
			data: mappedData.slice(offset, offset + limit),
			total: mappedData.length,
		};
	} catch (error) {
		console.error("Error fetching repatriate data:", error);
		return { data: [], total: 0 };
	}
}

export async function getSingleRepatriateData(
	id: string
): Promise<any | null> {
	const { data } = await getRepatriateData(0, 10000);
	return data.find((repatriate: any) => repatriate.id === id) ?? null;
}