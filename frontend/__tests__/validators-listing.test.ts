import { listingSchema } from "@/lib/validators/listing";

// Helper: build a fake File (jsdom supports File constructor).
const f = (name = "a.jpg") =>
  new File([new Uint8Array([1, 2, 3])], name, { type: "image/jpeg" });

describe("listingSchema", () => {
  const valid = {
    title: "Bicicleta aro 26",
    description: "Seminova, muito boa",
    price: 450,
    categoryCode: "esportes",
    subcategoryCode: "bicicleta",
    photos: [f()],
  };

  it("accepts a valid listing", () => {
    expect(() => listingSchema.parse(valid)).not.toThrow();
  });

  it("rejects title shorter than 3", () => {
    expect(() =>
      listingSchema.parse({ ...valid, title: "ab" })
    ).toThrow();
  });

  // D-02 revisto: 0 é doação explícita (exibida como "Doação"); negativo continua inválido.
  it("accepts price 0 as donation and rejects negative", () => {
    expect(() => listingSchema.parse({ ...valid, price: 0 })).not.toThrow();
    expect(() => listingSchema.parse({ ...valid, price: -10 })).toThrow();
  });

  it("rejects 0 photos", () => {
    expect(() => listingSchema.parse({ ...valid, photos: [] })).toThrow();
  });

  it("rejects 7 photos (D-01 max 6)", () => {
    expect(() =>
      listingSchema.parse({
        ...valid,
        photos: [f(), f(), f(), f(), f(), f(), f()],
      })
    ).toThrow();
  });

  it("rejects description > 500 chars", () => {
    expect(() =>
      listingSchema.parse({ ...valid, description: "a".repeat(501) })
    ).toThrow();
  });

  it("rejects invalid category code", () => {
    expect(() =>
      listingSchema.parse({ ...valid, categoryCode: "not-a-real-cat" })
    ).toThrow();
  });
});
