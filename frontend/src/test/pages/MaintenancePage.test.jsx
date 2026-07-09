import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MaintenancePage from "../../pages/MaintenancePage";

test("shows maintenance message", () => {
  render(<MaintenancePage />);

  expect(
    screen.getByText(/Resume Optimizer is under maintenance/i)
  ).toBeInTheDocument();

  expect(
    screen.getByText(/security and reliability/i)
  ).toBeInTheDocument();
});