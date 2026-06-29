import { useState, useEffect, useMemo } from 'react';
import { AutocompleteOption } from '@/components/ui/AutocompleteInput';

export function useAddressOptions(
  province: string, 
  district: string
) {
  const [addresses, setAddresses] = useState<any[]>([]);

  useEffect(() => {
    fetch('/thai_addresses.json')
      .then(res => res.json())
      .then(data => setAddresses(data))
      .catch(console.error);
  }, []);

  // 1. Province Options
  const provinces = useMemo(() => {
    const set = new Set<string>();
    addresses.forEach(a => {
      if (a.province) set.add(a.province);
    });
    return Array.from(set).sort();
  }, [addresses]);

  // 2. District Options: Format as "District » Province"
  const districtOptions = useMemo(() => {
    const filtered = province 
      ? addresses.filter(a => a.province === province)
      : addresses;
      
    const seen = new Set<string>();
    const opts: AutocompleteOption[] = [];
    
    filtered.forEach(a => {
      if (a.amphoe && a.province) {
        const key = `${a.amphoe} > ${a.province}`;
        if (!seen.has(key)) {
          seen.add(key);
          opts.push({
            label: `${a.amphoe} » ${a.province}`,
            value: a.amphoe,
            extra: { district: a.amphoe, province: a.province }
          });
        }
      }
    });
    
    return opts.sort((a, b) => a.label.localeCompare(b.label, 'th'));
  }, [addresses, province]);

  // 3. Sub-district Options: Format as "Sub-district » District » Province"
  const subDistrictOptions = useMemo(() => {
    let filtered = addresses;
    if (province && district) {
      filtered = addresses.filter(a => a.province === province && a.amphoe === district);
    } else if (province) {
      filtered = addresses.filter(a => a.province === province);
    } else if (district) {
      filtered = addresses.filter(a => a.amphoe === district);
    }
    
    const seen = new Set<string>();
    const opts: AutocompleteOption[] = [];
    
    filtered.forEach(a => {
      if (a.district && a.amphoe && a.province) {
        const key = `${a.district} > ${a.amphoe} > ${a.province}`;
        if (!seen.has(key)) {
          seen.add(key);
          opts.push({
            label: `${a.district} » ${a.amphoe} » ${a.province}`,
            value: a.district,
            extra: { subDistrict: a.district, district: a.amphoe, province: a.province }
          });
        }
      }
    });
    
    return opts.sort((a, b) => a.label.localeCompare(b.label, 'th'));
  }, [addresses, province, district]);

  return { provinces, districtOptions, subDistrictOptions };
}
