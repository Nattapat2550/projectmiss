import DataTable from "@/components/data-table/table";
import { getRepatriateData } from "@/lib/server/repatriate";

import { repatriateColumns } from "./columns";

export const dynamic = "force-dynamic";

export default async function Repatriate() {
	const { data } = await getRepatriateData(0, 100);
	return (
		<div>
			<DataTable
				columns={repatriateColumns}
				data={data}
				createUrl="/repatriate/create"
				singlePage={{ key: "id", url: "/repatriate" }}
			/>
		</div>
	);
}
