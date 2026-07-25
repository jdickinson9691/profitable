// Injectable so simulation functions are deterministic/testable instead of
// relying on statistical assertions (GDD agent-02/agent-03 contracts).
export type RandomFn = () => number;
