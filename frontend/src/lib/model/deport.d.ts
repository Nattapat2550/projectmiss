interface RepatriateData {
	id: string;
	first_name_th: string;
	middle_name_th?: string | null;
	last_name_th: string;

	first_name_en: string;
	middle_name_en?: string | null;
	last_name_en: string;

	gender: "male" | "female";
	national_id: string;
	passport_id?: string | null;

	birth_day: number;
	birth_month: number;
	birth_year: number;

	address: string;
	image_url?: string | null;

	number_of_case: number;
	number_of_warrant: number;

	is_victim?: boolean | null;
}
