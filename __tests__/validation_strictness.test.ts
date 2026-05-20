import { validateGraph } from "../validation";
import { Graph } from "../types";

describe("Validation Strictness", () => {
    test("Node ID should not be a complex object", () => {
        const invalidGraph = {
            nodes: [{ id: { complex: "object" }, label: "Invalid ID", type: "node" }],
            edges: [],
        } as unknown as Graph;

        // Currently this passes because String({complex: 'object'}) is "[object Object]"
        // which is less than MAX_ID_LENGTH.
        // We want this to fail.
        expect(() => validateGraph(invalidGraph)).toThrow(/ID must be a string or a number/);
    });

    test("Node type should be a string", () => {
        const invalidGraph = {
            nodes: [{ id: "1", label: "Invalid Type", type: 123 }],
            edges: [],
        } as unknown as Graph;

        expect(() => validateGraph(invalidGraph)).toThrow(/type must be a string/);
    });

    test("Edge label should be a string or array of strings", () => {
        const invalidGraph = {
            nodes: [
                { id: "1", label: "Node 1" },
                { id: "2", label: "Node 2" },
            ],
            edges: [{ source: "1", target: "2", label: 123 }],
        } as unknown as Graph;

        expect(() => validateGraph(invalidGraph)).toThrow(
            /label must be a string or an array of strings/
        );
    });

    test("Edge label as array should only contain strings", () => {
        const invalidGraph = {
            nodes: [
                { id: "1", label: "Node 1" },
                { id: "2", label: "Node 2" },
            ],
            edges: [{ source: "1", target: "2", label: ["valid", 123] }],
        } as unknown as Graph;

        expect(() => validateGraph(invalidGraph)).toThrow(/label array must only contain strings/);
    });
});
