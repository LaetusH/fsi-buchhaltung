export interface SaveEventCostCentreSplit {
  cost_centre_id: number
  allocation_percentage: number
}

export interface SaveEventBody {
  name: string
  starts_at: string
  ends_at: string
  location: string
  expected_guests: number
  member_organizer_ids: number[]
  subdivision_organizer_ids: number[]
  cost_centre_splits: SaveEventCostCentreSplit[]
}

export interface EventRow {
  id: number
  name: string
  starts_at: string
  ends_at: string
  location: string
  expected_guests: number
}

export interface EventMemberOrganizer {
  id: number
  full_name: string
}

export interface EventSubdivisionOrganizer {
  id: number
  code: string
  name: string
}

export interface EventCostCentreSplit extends SaveEventCostCentreSplit {
  code: string
  name: string
}

export interface Event extends EventRow {
  member_organizers: EventMemberOrganizer[]
  subdivision_organizers: EventSubdivisionOrganizer[]
  cost_centre_splits: EventCostCentreSplit[]
}

export interface EventMemberOption {
  id: number
  full_name: string
}

export interface EventSubdivisionOption {
  id: number
  code: string
  name: string
  is_active: boolean
}

export interface EventCostCentreOption {
  id: number
  code: string
  name: string
  is_active: boolean
}
