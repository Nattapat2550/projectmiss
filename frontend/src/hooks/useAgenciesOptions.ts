import { useState, useEffect, useMemo } from 'react';

interface Agency {
    command_center: string;
    division_type?: string;
    division_name?: string;
    station: string;
    officer_name: string;
}

export function useAgenciesOptions(
    selectedCommandCenter: string,
    selectedDivisionType: string,   // เช่น "division_1", "division_3"
    selectedDivision: string,        // ชื่อ บก. ที่เลือก
    selectedStation: string
) {
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAgencies = async () => {
            setLoading(true);
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
                const response = await fetch(`${backendUrl}/api/v1/agencies/options`);
                const data = await response.json();
                if (data.success) {
                    setAgencies(data.data);
                }
            } catch (error) {
                console.error("Error fetching agencies:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAgencies();
    }, []);

    // คำนวณตัวเลือก บช. (ไม่ซ้ำ)
    const commandCenterOptions = useMemo(() => {
        const set = new Set(agencies.map(a => a.command_center).filter(Boolean));
        return Array.from(set).map(val => ({ label: val, value: val }));
    }, [agencies]);

    // คำนวณตัวเลือก บก. (กรองตาม บช. และ division_type ที่เลือก)
    const divisionOptions = useMemo(() => {
        let filtered = agencies;
        if (selectedCommandCenter) {
            filtered = filtered.filter(a => a.command_center === selectedCommandCenter);
        }
        if (selectedDivisionType) {
            filtered = filtered.filter(a => a.division_type === selectedDivisionType);
        }
        const set = new Set<string>(filtered.map(a => a.division_name).filter(Boolean) as string[]);
        return Array.from(set).map(val => ({ label: val, value: val }));
    }, [agencies, selectedCommandCenter, selectedDivisionType]);

    // คำนวณตัวเลือก สน./สภ. (กรองตาม บช. และ division_name)
    const stationOptions = useMemo(() => {
        let filtered = agencies;
        if (selectedCommandCenter) {
            filtered = filtered.filter(a => a.command_center === selectedCommandCenter);
        }
        if (selectedDivision) {
            filtered = filtered.filter(a => a.division_name === selectedDivision);
        }
        const set = new Set(filtered.map(a => a.station).filter(Boolean));
        return Array.from(set).map(val => ({ label: val, value: val }));
    }, [agencies, selectedCommandCenter, selectedDivision]);

    return { commandCenterOptions, divisionOptions, stationOptions, loading };
}
