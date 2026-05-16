import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import FilterChips from "@/components/features/marketplace/FilterChips";

describe("FilterChips", () => {
  it("defaults verifiedOnly ON and toggling OFF shows warning (D-10)", () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <FilterChips
        filters={{ verifiedOnly: true, sort: "recent" }}
        onChange={onChange}
      />
    );

    const checkbox = screen.getByRole("checkbox", {
      name: /Apenas verificados/,
    });
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith({ verifiedOnly: false });

    rerender(
      <FilterChips
        filters={{ verifiedOnly: false, sort: "recent" }}
        onChange={onChange}
      />
    );
    expect(
      screen.getByText(/Vendedor não verificado/)
    ).toBeInTheDocument();
  });

  it("clicking a category chip fires onChange with that code", () => {
    const onChange = jest.fn();
    render(
      <FilterChips
        filters={{ verifiedOnly: true, sort: "recent" }}
        onChange={onChange}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Eletrônicos & Informática/ })
    );
    expect(onChange).toHaveBeenCalledWith({ category: "eletronicos" });
  });

  describe("sort chips", () => {
    it("renders three sort options", () => {
      render(
        <FilterChips
          filters={{ verifiedOnly: true, sort: "recent" }}
          onChange={jest.fn()}
        />
      );
      expect(screen.getByRole("button", { name: "Mais recentes" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Menor preço" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Maior preço" })).toBeInTheDocument();
    });

    it("active sort chip has aria-pressed=true", () => {
      render(
        <FilterChips
          filters={{ verifiedOnly: true, sort: "price_asc" }}
          onChange={jest.fn()}
        />
      );
      expect(screen.getByRole("button", { name: "Menor preço" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Mais recentes" })).toHaveAttribute("aria-pressed", "false");
    });

    it("clicking 'Menor preço' fires onChange with sort=price_asc", () => {
      const onChange = jest.fn();
      render(
        <FilterChips
          filters={{ verifiedOnly: true, sort: "recent" }}
          onChange={onChange}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: "Menor preço" }));
      expect(onChange).toHaveBeenCalledWith({ sort: "price_asc" });
    });

    it("clicking 'Maior preço' fires onChange with sort=price_desc", () => {
      const onChange = jest.fn();
      render(
        <FilterChips
          filters={{ verifiedOnly: true, sort: "recent" }}
          onChange={onChange}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: "Maior preço" }));
      expect(onChange).toHaveBeenCalledWith({ sort: "price_desc" });
    });

    it("defaults to 'Mais recentes' when sort is undefined", () => {
      render(
        <FilterChips
          filters={{ verifiedOnly: true }}
          onChange={jest.fn()}
        />
      );
      expect(screen.getByRole("button", { name: "Mais recentes" })).toHaveAttribute("aria-pressed", "true");
    });
  });
});
