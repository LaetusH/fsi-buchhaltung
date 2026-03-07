<template>
  <PageSettingsEntityManager
    title="Kostenstellen"
    singular-label="Kostenstelle"
    add-label="Neue Kostenstelle"
    empty-label="Keine Kostenstellen vorhanden"
    list-endpoint="/api/cost_centres"
    save-endpoint="/api/cost_centres/save"
    activate-endpoint="/api/cost_centres/activate"
    response-list-key="costCentres"
  />
</template>
