<template>
  <PageSettingsEntityManager
    title="Positionen"
    singular-label="Position"
    add-label="Neue Position"
    empty-label="Keine Positionen vorhanden"
    list-endpoint="/api/positions"
    save-endpoint="/api/positions/save"
    activate-endpoint="/api/positions/activate"
    response-list-key="positions"
  />
</template>
