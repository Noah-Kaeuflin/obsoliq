/* ObsoliQ Recovery Engine
 * Pure recovery waterfall, cap and invariant validation logic.
 */
(function registerRecoveryEngine(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.recovery = root.recovery || {};

  const RECOVERY_VALIDATION_EPSILON = 0.000001;

function recoveryInputValue(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function calculateNoDemandValue(item) {
  return recoveryInputValue(item.direct_no_need_value)
    + recoveryInputValue(item.no_need_conso_value)
    + recoveryInputValue(item.no_need_no_con_value);
}

function calculateRecoveryBreakdown(item) {
  const stockValue = recoveryInputValue(item.stock_value);
  const noNeedValue = recoveryInputValue(item.no_need_value);
  const noPlanValue = recoveryInputValue(item.no_plan_value);
  const excessValue = recoveryInputValue(item.excess_value);
  const badStockValue = recoveryInputValue(item.bad_stock_value);
  const grossRecoveryPotential = noNeedValue + noPlanValue + excessValue + badStockValue;

  let remainingStockValue = stockValue;
  const netNoNeedValue = Math.min(noNeedValue, remainingStockValue);
  remainingStockValue -= netNoNeedValue;
  const netNoPlanValue = Math.min(noPlanValue, remainingStockValue);
  remainingStockValue -= netNoPlanValue;
  const netExcessValue = Math.min(excessValue, remainingStockValue);
  remainingStockValue -= netExcessValue;
  const netBadStockValue = Math.min(badStockValue, remainingStockValue);
  remainingStockValue -= netBadStockValue;

  const recoveryPotential = netNoNeedValue + netNoPlanValue + netExcessValue + netBadStockValue;

  return {
    gross_recovery_potential: grossRecoveryPotential,
    recovery_potential: recoveryPotential,
    recovery_overlap_value: Math.max(0, grossRecoveryPotential - recoveryPotential),
    recovery_available_stock_value: Math.max(0, stockValue - recoveryPotential),
    recovery_is_capped: grossRecoveryPotential > stockValue,
    net_no_need_value: netNoNeedValue,
    net_no_plan_value: netNoPlanValue,
    net_excess_value: netExcessValue,
    net_bad_stock_value: netBadStockValue
  };
}

function recoveryValuesForValidation(row) {
  return {
    stockValue: recoveryInputValue(row.stock_value),
    grossRecoveryPotential: recoveryInputValue(row.gross_recovery_potential),
    recoveryPotential: recoveryInputValue(row.recovery_potential),
    recoveryOverlapValue: recoveryInputValue(row.recovery_overlap_value),
    recoveryAvailableStockValue: recoveryInputValue(row.recovery_available_stock_value),
    netNoNeedValue: recoveryInputValue(row.net_no_need_value),
    netNoPlanValue: recoveryInputValue(row.net_no_plan_value),
    netExcessValue: recoveryInputValue(row.net_excess_value),
    netBadStockValue: recoveryInputValue(row.net_bad_stock_value),
    excessValue: Number(row.excess_value),
    badStockValue: Number(row.bad_stock_value),
    noNeedValue: Number(row.no_need_value),
    noPlanValue: Number(row.no_plan_value)
  };
}

function finiteOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function recoveryValidationError(row, rule, message, values) {
  return {
    row_number: row.row_number,
    material_id: row.material_id,
    profit_center: row.profit_center,
    rule,
    message,
    values
  };
}

function validateRecoveryDataset(rows) {
  const errors = [];
  rows.forEach(row => {
    const values = recoveryValuesForValidation(row);
    const netSum = values.netNoNeedValue + values.netNoPlanValue + values.netExcessValue + values.netBadStockValue;
    const expectedOverlap = Math.max(0, values.grossRecoveryPotential - values.recoveryPotential);
    const expectedAvailableStock = Math.max(0, values.stockValue - values.recoveryPotential);
    const expectedCapped = values.grossRecoveryPotential > values.stockValue;

    const rawRecoveryPotential = finiteOrZero(row.recovery_potential);

    if (rawRecoveryPotential < 0) {
      errors.push(recoveryValidationError(row, "NON_NEGATIVE_RECOVERY", "recovery_potential must not be negative.", { recovery_potential: row.recovery_potential }));
    }
    if (values.recoveryPotential - values.stockValue > RECOVERY_VALIDATION_EPSILON) {
      errors.push(recoveryValidationError(row, "RECOVERY_NOT_ABOVE_STOCK", "recovery_potential must not exceed stock_value.", {
        recovery_potential: row.recovery_potential,
        stock_value: row.stock_value
      }));
    }
    if (Math.abs(netSum - values.recoveryPotential) > RECOVERY_VALIDATION_EPSILON) {
      errors.push(recoveryValidationError(row, "NET_SUM_MATCHES_RECOVERY", "Net recovery allocation must match recovery_potential.", {
        net_sum: netSum,
        recovery_potential: row.recovery_potential
      }));
    }
    if (Math.abs(values.recoveryOverlapValue - expectedOverlap) > RECOVERY_VALIDATION_EPSILON) {
      errors.push(recoveryValidationError(row, "OVERLAP_MATCHES_DIFFERENCE", "recovery_overlap_value must match gross minus net recovery.", {
        recovery_overlap_value: row.recovery_overlap_value,
        expected_overlap: expectedOverlap
      }));
    }
    if (Math.abs(values.recoveryAvailableStockValue - expectedAvailableStock) > RECOVERY_VALIDATION_EPSILON) {
      errors.push(recoveryValidationError(row, "AVAILABLE_STOCK_MATCHES_DIFFERENCE", "recovery_available_stock_value must match stock minus recovery.", {
        recovery_available_stock_value: row.recovery_available_stock_value,
        expected_available_stock: expectedAvailableStock
      }));
    }
    if (row.recovery_is_capped !== expectedCapped) {
      errors.push(recoveryValidationError(row, "CAPPED_FLAG_IS_CORRECT", "recovery_is_capped must match gross recovery above stock value.", {
        recovery_is_capped: row.recovery_is_capped,
        expected_capped: expectedCapped
      }));
    }
    [
      ["excess_value", values.excessValue],
      ["bad_stock_value", values.badStockValue],
      ["no_need_value", values.noNeedValue],
      ["no_plan_value", values.noPlanValue]
    ].forEach(([key, value]) => {
      if (Number.isFinite(value) && value < 0) {
        errors.push(recoveryValidationError(row, "RAW_VALUES_NOT_MUTATED", "Raw risk values must not be negative after normalization.", {
          field: key,
          value: row[key]
        }));
      }
    });
  });
  return errors;
}

function logRecoveryDatasetValidation(rows) {
  const errors = validateRecoveryDataset(rows);
  if (errors.length) {
    console.error(`ObsoliQ Recovery Validation: ${errors.length} validation errors found.`);
    console.table(errors);
  } else {
    console.info(`ObsoliQ Recovery Validation: ${rows.length} rows validated successfully.`);
  }
  return errors;
}

function runRecoveryCalculationSelfTests() {
  const tests = [
    {
      name: "waterfall allocates exact stock without overlap",
      input: { stock_value: 100, no_need_value: 40, no_plan_value: 30, excess_value: 20, bad_stock_value: 10 },
      expected: {
        gross_recovery_potential: 100,
        net_no_need_value: 40,
        net_no_plan_value: 30,
        net_excess_value: 20,
        net_bad_stock_value: 10,
        recovery_potential: 100,
        recovery_overlap_value: 0,
        recovery_available_stock_value: 0,
        recovery_is_capped: false
      }
    },
    {
      name: "waterfall caps overlapping categories by stock",
      input: { stock_value: 100, no_need_value: 80, no_plan_value: 50, excess_value: 40, bad_stock_value: 20 },
      expected: {
        gross_recovery_potential: 190,
        net_no_need_value: 80,
        net_no_plan_value: 20,
        net_excess_value: 0,
        net_bad_stock_value: 0,
        recovery_potential: 100,
        recovery_overlap_value: 90,
        recovery_available_stock_value: 0,
        recovery_is_capped: true
      }
    },
    {
      name: "overlapping waterfall values are capped by stock",
      input: { stock_value: 100, no_need_value: 70, no_plan_value: 20, excess_value: 60, bad_stock_value: 10 },
      expected: {
        gross_recovery_potential: 160,
        net_no_need_value: 70,
        net_no_plan_value: 20,
        net_excess_value: 10,
        net_bad_stock_value: 0,
        recovery_potential: 100,
        recovery_overlap_value: 60,
        recovery_available_stock_value: 0,
        recovery_is_capped: true
      }
    },
    {
      name: "non-overlapping values remain fully addressable",
      input: { stock_value: 200, no_need_value: 20, no_plan_value: 30, excess_value: 40, bad_stock_value: 10 },
      expected: {
        gross_recovery_potential: 100,
        recovery_potential: 100,
        recovery_overlap_value: 0,
        recovery_available_stock_value: 100,
        recovery_is_capped: false
      }
    },
    {
      name: "single category above stock is capped",
      input: { stock_value: 100, no_need_value: 150, no_plan_value: 0, excess_value: 0, bad_stock_value: 0 },
      expected: {
        recovery_potential: 100,
        recovery_overlap_value: 50,
        net_no_need_value: 100
      }
    },
    {
      name: "zero stock cannot create net recovery",
      input: { stock_value: 0, no_need_value: 0, no_plan_value: 0, excess_value: 50, bad_stock_value: 0 },
      expected: {
        recovery_potential: 0,
        recovery_overlap_value: 50,
        recovery_is_capped: true
      }
    },
    {
      name: "invalid and negative values are treated as zero",
      input: { stock_value: 100, no_need_value: -50, no_plan_value: null, excess_value: undefined, bad_stock_value: NaN },
      expected: {
        gross_recovery_potential: 0,
        recovery_potential: 0,
        recovery_overlap_value: 0,
        recovery_is_capped: false
      }
    }
  ];

  tests.forEach(test => {
    const result = calculateRecoveryBreakdown(test.input);
    Object.entries(test.expected).forEach(([key, expected]) => {
      console.assert(Object.is(result[key], expected), `Recovery self-test failed (${test.name}): ${key}`);
    });
    console.assert(result.recovery_potential >= 0, `Recovery self-test failed (${test.name}): recovery_potential >= 0`);
    console.assert(result.recovery_potential <= recoveryInputValue(test.input.stock_value), `Recovery self-test failed (${test.name}): recovery_potential <= stock_value`);
    console.assert(result.recovery_overlap_value >= 0, `Recovery self-test failed (${test.name}): recovery_overlap_value >= 0`);
    console.assert(
      result.net_no_need_value + result.net_no_plan_value + result.net_excess_value + result.net_bad_stock_value === result.recovery_potential,
      `Recovery self-test failed (${test.name}): net values sum to recovery_potential`
    );
  });
  console.assert(
    calculateNoDemandValue({ direct_no_need_value: 10, no_need_conso_value: 20, no_need_no_con_value: 30 }) === 60,
    "Recovery self-test failed: split no-demand inputs aggregate"
  );
  console.assert(
    calculateNoDemandValue({ direct_no_need_value: -10, no_need_conso_value: "invalid", no_need_no_con_value: 30 }) === 30,
    "Recovery self-test failed: negative and invalid no-demand inputs are ignored"
  );
}

function recoveryTestRow(input = {}) {
  const base = {
    row_number: 1,
    material_id: "TEST-MAT",
    profit_center: "TEST-PC",
    stock_value: 100,
    no_need_value: 70,
    no_plan_value: 20,
    excess_value: 60,
    bad_stock_value: 10,
    ...input
  };
  return { ...base, ...calculateRecoveryBreakdown(base) };
}

function hasRecoveryValidationRule(errors, rule) {
  return errors.some(error => error.rule === rule);
}

function runRecoveryDatasetValidationSelfTests() {
  const validRow = recoveryTestRow();
  console.assert(validateRecoveryDataset([validRow]).length === 0, "Recovery dataset validation self-test failed: valid row");

  const aboveStockRow = { ...validRow, recovery_potential: 120 };
  console.assert(
    hasRecoveryValidationRule(validateRecoveryDataset([aboveStockRow]), "RECOVERY_NOT_ABOVE_STOCK"),
    "Recovery dataset validation self-test failed: recovery above stock"
  );

  const wrongNetRow = {
    ...validRow,
    recovery_potential: 50,
    net_no_need_value: 10,
    net_no_plan_value: 10,
    net_excess_value: 10,
    net_bad_stock_value: 10,
    recovery_overlap_value: Math.max(0, validRow.gross_recovery_potential - 50),
    recovery_available_stock_value: Math.max(0, validRow.stock_value - 50),
    recovery_is_capped: validRow.gross_recovery_potential > validRow.stock_value
  };
  console.assert(
    hasRecoveryValidationRule(validateRecoveryDataset([wrongNetRow]), "NET_SUM_MATCHES_RECOVERY"),
    "Recovery dataset validation self-test failed: net sum mismatch"
  );

  const wrongOverlapRow = {
    ...validRow,
    stock_value: 100,
    gross_recovery_potential: 120,
    recovery_potential: 100,
    recovery_overlap_value: 5,
    recovery_available_stock_value: 0,
    recovery_is_capped: true
  };
  console.assert(
    hasRecoveryValidationRule(validateRecoveryDataset([wrongOverlapRow]), "OVERLAP_MATCHES_DIFFERENCE"),
    "Recovery dataset validation self-test failed: overlap mismatch"
  );

  const wrongCappedRow = {
    ...validRow,
    stock_value: 100,
    gross_recovery_potential: 150,
    recovery_potential: 100,
    recovery_overlap_value: 50,
    recovery_available_stock_value: 0,
    recovery_is_capped: false
  };
  console.assert(
    hasRecoveryValidationRule(validateRecoveryDataset([wrongCappedRow]), "CAPPED_FLAG_IS_CORRECT"),
    "Recovery dataset validation self-test failed: capped flag mismatch"
  );

  const toleranceRow = {
    ...validRow,
    recovery_overlap_value: validRow.recovery_overlap_value + RECOVERY_VALIDATION_EPSILON / 2
  };
  console.assert(validateRecoveryDataset([toleranceRow]).length === 0, "Recovery dataset validation self-test failed: EPSILON tolerance");
}

  root.recovery.engine = Object.freeze({
    version: "1",
    RECOVERY_VALIDATION_EPSILON,
    recoveryInputValue,
    calculateNoDemandValue,
    calculateRecoveryBreakdown,
    validateRecoveryDataset,
    logRecoveryDatasetValidation,
    runRecoveryCalculationSelfTests,
    runRecoveryDatasetValidationSelfTests
  });
})(window);
