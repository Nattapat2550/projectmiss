import pool from "../config/db";

export const getAgenciesOptions = async (req, res) => {
    try {
        const query = `
            SELECT 
                DISTINCT command_center, 
                division_name,
                station, 
                officer_name 
            FROM agencies 
            ORDER BY command_center, station
        `;
        const { rows } = await pool.query(query);

        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error("Error fetching agencies options:", err);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล agencies" });
    }
};
