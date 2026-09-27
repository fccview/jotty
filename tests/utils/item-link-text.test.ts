import { describe, it, expect } from "vitest"
import { plainItemText } from "@/app/_utils/item-href-utils"
import { linkQueryOf } from "@/app/_hooks/useItemLinkSuggestions"

describe("plainItemText", () => {
  it("keeps the words of links and wikilinks and drops the syntax", () => {
    expect(
      plainItemText(
        "Check [Boiler \\[old\\]](/note/9e5e4c9f-4dd0-4306-9690-3af758cc23f1) and [[Tokyo itinerary#Day 1|the trip]] then [[Plan]]",
      ),
    ).toBe("Check Boiler [old] and the trip then Plan")
  })

  it("leaves ordinary text alone", () => {
    expect(plainItemText("Buy milk #home")).toBe("Buy milk #home")
  })
})

describe("linkQueryOf", () => {
  it("opens on @ at the start or after a space", () => {
    expect(linkQueryOf("@boi")).toEqual({ start: 0, query: "boi" })
    expect(linkQueryOf("Check the @boi")).toEqual({ start: 10, query: "boi" })
  })

  it("ignores @ inside an email address", () => {
    expect(linkQueryOf("mail me@home")).toBeNull()
  })

  it("closes an @ query on a space but lets [[ run across words", () => {
    expect(linkQueryOf("Check @boiler room")).toBeNull()
    expect(linkQueryOf("and [[living room")).toEqual({ start: 4, query: "living room" })
  })

  it("stops once the wikilink is closed", () => {
    expect(linkQueryOf("and [[Plan]]")).toBeNull()
  })
})
