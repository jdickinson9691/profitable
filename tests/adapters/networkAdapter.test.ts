import { test } from "node:test";
import assert from "node:assert/strict";
import { createStubNetworkAdapter } from "../../src/adapters/networkAdapter.ts";

test("NetworkAdapter stub methods are callable no-ops", () => {
  const network = createStubNetworkAdapter();

  assert.doesNotThrow(() => network.connect("wss://example.invalid"));
  assert.doesNotThrow(() => network.send({ type: "ping" }));
  assert.doesNotThrow(() => network.disconnect());
});
