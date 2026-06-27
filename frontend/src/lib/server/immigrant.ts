// ฟังก์ชันเดิมที่มีอยู่แล้ว (คงไว้เผื่อมีการเรียกใช้ที่จุดอื่น)
export async function getImmigrantData(
	page: number = 0,
	limit: number = 25
): Promise<{
	data: any[]; 
	total: number;
}> {
	try {
		const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
		const response = await fetch(`${backendUrl}/api/v1/immigrants`, { cache: 'no-store' });
		if (!response.ok) throw new Error("Failed to fetch immigrant data");

		const result = await response.json();
		const rawData = result.data?.illegals || [];
		const mappedData = rawData.map((item: any) => ({
			id: item.id,
			first_name: item.first_name_th || item.first_name_en || "ไม่ระบุ",
			middle_name: item.middle_name_th || item.middle_name_en || null,
			last_name: item.last_name_th || item.last_name_en || "ไม่ระบุ",
			gender: item.gender === "หญิง" ? "female" : "male", 
			nationality: item.nationality || "ไม่ระบุ",
			passport_id: item.passport_id || null,
			detected_location: item.detected_location || "ไม่ระบุสถานที่",
			detected_date: item.detected_date ? new Date(item.detected_date).toISOString() : null,
			is_victim: item.is_victim ?? null,
			image_url: item.photo_url || null,
		}));
		const offset = page * limit;
		return { data: mappedData.slice(offset, offset + limit), total: mappedData.length };
	} catch (error) {
		console.error("Error fetching immigrant data:", error);
		return { data: [], total: 0 };
	}
}

// 🛠️ ปรับปรุงฟังก์ชันดึงรายบุคคล: เรียกข้อมูลตรงด้วย ID จากเส้น API หลังบ้านโดยไม่ต้องโหลดข้อมูลทั้งหมดมาวนลูปหา
export async function getSingleImmigrantData(id: string): Promise<any | null> {
	try {
		const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
		
		// ยิงดึงข้อมูลตรงไปยัง Endpoint รายบุคคลที่สร้างขึ้นที่หลังบ้าน (/api/v1/immigrants/illegal/:id)
		const response = await fetch(`${backendUrl}/api/v1/immigrants/illegal/${id}`, { 
			cache: 'no-store' 
		});

		if (!response.ok) {
			return null;
		}

		const result = await response.json();
		
		if (result.success && result.data) {
			const item = result.data;
			// Map ข้อมูลให้โครงสร้างตรงกับหน้า Page เรียกใช้งานเดิม
			return {
				id: item.id,
				first_name: item.first_name_th || item.first_name_en || "ไม่ระบุ",
				middle_name: item.middle_name_th || item.middle_name_en || null,
				last_name: item.last_name_th || item.last_name_en || "ไม่ระบุ",
				gender: item.gender === "หญิง" ? "female" : "male", 
				nationality: item.nationality || "ไม่ระบุ",
				passport_id: item.passport_id || null,
				detected_location: item.detected_location || "ไม่ระบุสถานที่",
				detected_date: item.detected_date ? new Date(item.detected_date).toISOString() : null,
				is_victim: item.is_victim ?? null,
				image_url: item.photo_url || null,
			};
		}
		
		return null;
	} catch (error) {
		console.error("Error fetching single immigrant data:", error);
		return null;
	}
}

// ฟังก์ชันเดิมสำหรับระบบ Dashboard Pagination
export async function getImmigrantDashboardData(
	type: "illegal" | "repatriated",
	page: number = 1,
	limit: number = 50,
	search: string = "",
	sortBy: string = "",
	sortOrder: string = "desc"
): Promise<{
	tableData: any[];
	meta: {
		totalItems: number;
		totalPages: number;
		currentPage: number;
		limit: number;
	};
}> {
	try {
		const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
		
		const params = new URLSearchParams({
			type,
			page: page.toString(),
			limit: limit.toString(),
		});
		
		if (search.trim() !== "") params.append("search", search);
		if (sortBy.trim() !== "") params.append("sortBy", sortBy);
		if (sortOrder.trim() !== "") params.append("sortOrder", sortOrder);

		const response = await fetch(`${backendUrl}/api/v1/immigrants/dashboard?${params.toString()}`, {
			cache: 'no-store'
		});

		if (!response.ok) {
			throw new Error("Failed to fetch dashboard data");
		}

		return await response.json();
	} catch (error) {
		console.error("Error fetching immigrant dashboard data:", error);
		return {
			tableData: [],
			meta: { totalItems: 0, totalPages: 1, currentPage: page, limit }
		};
	}
}