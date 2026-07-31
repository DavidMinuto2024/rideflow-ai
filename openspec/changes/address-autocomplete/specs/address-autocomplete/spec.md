# Address Autocomplete Specification

## Purpose

Define the behavior of the `AddressAutocomplete` component and the integration contract for all forms that collect geographic addresses requiring geocoding (lat/lng).

## Requirements

### Requirement: Autocomplete Suggestions

The `AddressAutocomplete` component MUST query the Nominatim OSM API when the user has typed 3 or more characters.

The component MUST apply a debounce of 400 ms before sending a request.

The component MUST include a `User-Agent` header identifying the application on every Nominatim request.

The component SHOULD limit results to `countrycodes=co` by default, configurable via a `countryCode` prop.

The component MUST show at most 5 suggestions.

#### Scenario: User types enough characters

- GIVEN the address input is focused
- WHEN the user types 3 or more characters and waits 400 ms
- THEN a dropdown of up to 5 address suggestions appears below the input

#### Scenario: User types fewer than 3 characters

- GIVEN the address input has fewer than 3 characters
- WHEN 400 ms elapse
- THEN no request is made and no dropdown is shown

#### Scenario: Nominatim returns no results

- GIVEN the user typed 3+ characters
- WHEN Nominatim returns an empty array
- THEN the dropdown shows a "No se encontraron resultados" message

#### Scenario: Network error during search

- GIVEN the user typed 3+ characters
- WHEN the Nominatim request fails
- THEN the dropdown is hidden and no error is thrown to the parent

---

### Requirement: Address Selection with Geocoding

When the user selects a suggestion, the component MUST:
1. Fill the input with the suggestion's `display_name`
2. Call the `onSelect({ address: string, lat: number, lng: number })` callback with parsed float coordinates
3. Close the dropdown

The component MUST NOT call `onSelect` when the user types freely without selecting a suggestion.

#### Scenario: User selects a suggestion

- GIVEN the dropdown is showing suggestions
- WHEN the user clicks a suggestion OR presses Enter on a highlighted suggestion
- THEN the input is filled with the suggestion text
- AND `onSelect({ address, lat, lng })` is called with the parsed coordinates
- AND the dropdown closes

#### Scenario: User clears the input after selection

- GIVEN a suggestion was previously selected
- WHEN the user clears the input
- THEN `onSelect` is NOT called again (no stale coords propagated)

---

### Requirement: Keyboard Navigation

The component SHOULD support keyboard navigation for accessibility.

#### Scenario: Arrow key navigation

- GIVEN the dropdown is open
- WHEN the user presses ↓ or ↑
- THEN the highlighted suggestion moves down or up accordingly

#### Scenario: Escape key closes dropdown

- GIVEN the dropdown is open
- WHEN the user presses Escape
- THEN the dropdown closes without selecting

---

### Requirement: Form Integration — Event Creation

The `/events/new` form MUST use `AddressAutocomplete` for both `destination` and `origin` fields.

The form MUST send `destLat`, `destLng`, `originLat`, `originLng` in the create event payload when coordinates are available.

#### Scenario: Event created with geocoded destination

- GIVEN the user selected a destination from the autocomplete
- WHEN the form is submitted
- THEN the API call includes `destLat` and `destLng` as numbers

#### Scenario: Event created with free-text destination

- GIVEN the user typed a destination without selecting from the dropdown
- WHEN the form is submitted
- THEN the API call includes `destination` as a string and omits `destLat`/`destLng`

---

### Requirement: Form Integration — Driver Join via Invite

The driver form in `/invite/[token]` MUST use `AddressAutocomplete` for the `startLocation` field and populate `startLat`/`startLng` on selection.

#### Scenario: Driver joins with geocoded start location

- GIVEN the driver selected their start location from autocomplete
- WHEN the form is submitted
- THEN `joinEvent` is called with `startLat` and `startLng` as numbers

---

### Requirement: Form Integration — Passenger Join via Invite

The passenger form in `/invite/[token]` MUST replace the manual lat/lng inputs with `AddressAutocomplete` for `pickupAddress`, automatically populating `pickupLat`/`pickupLng`.

#### Scenario: Passenger joins with geocoded pickup address

- GIVEN the passenger selected their pickup address from autocomplete
- WHEN the form is submitted
- THEN `joinEvent` is called with `pickupLat` and `pickupLng` as numbers
