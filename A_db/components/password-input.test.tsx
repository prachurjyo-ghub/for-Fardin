// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PasswordInput } from "./password-input";

describe("PasswordInput", () => {
  it("reveals and hides the password without changing its value", () => {
    render(
      <PasswordInput aria-label="Password" defaultValue="SafePassword1" />,
    );
    const input = screen.getByLabelText("Password");
    expect(input).toHaveProperty("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveProperty("type", "text");
    expect(input).toHaveProperty("value", "SafePassword1");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveProperty("type", "password");
  });
});
