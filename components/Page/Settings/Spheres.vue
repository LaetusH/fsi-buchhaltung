<template>
  <PageSettingsEntityManager
    title="Sphären"
    singular-label="Sphäre"
    add-label="Neue Sphäre"
    empty-label="Keine Sphären vorhanden"
    list-endpoint="/api/spheres"
    save-endpoint="/api/spheres/save"
    activate-endpoint="/api/spheres/activate"
    response-list-key="spheres"
  />
</template>
