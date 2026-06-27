import DataTable from "@/components/data-table/table";
import { getImmigrantData } from "@/lib/server/immigrant";

import { immigrantColumns } from "./columns";

export const dynamic = "force-dynamic";

export default async function Immigrant() {
	const { data } = await getImmigrantData(0, 100);
	return (
		<div>
			<DataTable
				columns={immigrantColumns}
				data={data}
				createUrl="/immigrant/create"
				singlePage={{ key: "id", url: "/immigrant" }}
			/>
		</div>
	);
}
