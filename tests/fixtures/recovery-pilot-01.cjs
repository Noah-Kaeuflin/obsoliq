// Synthetic contract-derived pilot inputs; no customer or personal data.
const headers = ['purchase_order','purchase_order_item','material_id','plant','open_quantity','base_unit','supplier','delivery_date','buyer','item_status','open_value','source_currency','source_system'];
const base = (order, item, material, plant, quantity, unit, date = '', value = null) =>
  [order,item,material,plant,quantity,unit,'Synthetischer Lieferant – Prüftechnik',date,'Synthetischer Einkauf','open',value,value === null ? '' : 'EUR','SYNTHETIC-PILOT'];
const rows = [
  base('0004500001','00010','MAT-1090','PLANT-03',12,'EA','2026-10-01',4920),
  base('0004500001','00020','MAT-1090','PLANT-03',8,'EA','2026-11-01',3280),
  base('0004500002','00010','MAT-1090','PLANT-01',4,'EA'),
  base('0004500003','00010','MAT-1001','PLANT-02',3,'EA','2026-10-01',14.4),
  base('PO-UNKNOWN','A-01','MAT-UNKNOWN','PLANT-03',2,'EA'),
  base('0004500005','00010','MAT-1090','PLANT-03',10,''),
  base('0004500006','00010','MAT-1090','PLANT-03',10,'KG'),
  base('0004500007','00010','MAT-1090','PLANT-03',10,'EA'),
  base('0004500007','00010','MAT-1090','PLANT-03',20,'EA'),
  base('0004500008','00010','MAT-1090','PLANT-03',0,'EA','',0),
  base('0004500009','00010','MAT-1090','PLANT-03','12abc','EA'),
  base('0004500010','00010','MAT-1090','PLANT-03',null,'EA')
];
// Expectations fixed before import runs, from the PO v1 / decision / backup contracts.
const expected = [
  [12,'matched','',true], [8,'matched','',true], [4,'unmatched','',false],
  [3,'matched','',false], [2,'unmatched','',false], [10,'excluded','missing_base_unit',false],
  [10,'unit_conflict','',false], [10,'excluded','duplicate_position',false],
  [20,'excluded','duplicate_position',false], [0,'excluded','zero_open_quantity',false],
  [null,'excluded','quantity_invalid',false], [null,'excluded','quantity_missing',false]
];
module.exports = { classification: 'synthetic', version: 'recovery-pilot-01-v1', headers, rows, expected, base };
