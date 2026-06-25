import type { Meta, StoryObj } from "@storybook/react";
import { Table, THead, TBody, TR, TH, TD } from "./table";
import { Badge } from "./badge";
import { SearchInput } from "./search-input";
import { Select } from "./input";
import { Card, CardContent } from "./card";

const meta: Meta = {
  title: "UI/Table (with filters)",
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj;

export const WithFilters: Story = {
  render: () => (
    <div className="w-[640px] space-y-3">
      {/* FilterBar composition: search + selects above the table */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-56">
          <SearchInput placeholder="Search…" />
        </div>
        <Select className="h-10 w-auto">
          <option>All properties</option>
          <option>12 Oakfield Road</option>
        </Select>
        <Select className="h-10 w-auto">
          <option>Income &amp; expenses</option>
          <option>Income only</option>
        </Select>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Description</TH>
                <TH>Status</TH>
                <TH className="text-right">Amount</TH>
              </TR>
            </THead>
            <TBody>
              <TR>
                <TD>6 Apr 2026</TD>
                <TD>Monthly rent received</TD>
                <TD><Badge tone="success">Reconciled</Badge></TD>
                <TD className="text-right text-success">+£500.00</TD>
              </TR>
              <TR>
                <TD>5 Apr 2026</TD>
                <TD>Letting agent fee</TD>
                <TD><Badge tone="warning">Unreconciled</Badge></TD>
                <TD className="text-right text-danger">−£50.00</TD>
              </TR>
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  ),
};
