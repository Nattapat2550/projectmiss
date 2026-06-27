interface ImmigrantData {
	id: string;
	first_name: string;
	middle_name?: string | null;
	last_name: string;

	gender: "male" | "female";
	nationality: string;
	passport_id?: string | null;

	detected_location: string;
	detected_date?: string | null;

	is_victim?: boolean | null;

	// เพิ่มข้อมูลคนอัพโหลด
	creator_name?: string | null;
	creator_color?: string | null;
}