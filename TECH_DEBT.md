# Technical Debt Log

This document tracks technical debt items that have been identified and deferred for future resolution. Each item should clearly describe the debt, its impact, and proposed resolution.

## 1. Naming Inconsistency: 'armadorId' vs. 'assemblerId'

-   **Description:** Throughout the application, there is an inconsistency in naming conventions for entities related to assemblers/armadores. The database schema (Prisma) and some backend code currently use Spanish terms like `armadorId`, while the frontend and parts of the backend are moving towards English terms like `assemblerId`. This leads to a translation layer in the API and potential confusion.
-   **Impact:**
    *   Reduced code readability and maintainability.
    *   Increased cognitive load for developers (due to mixed language identifiers).
    *   Potential for future bugs if not handled carefully.
-   **Proposed Resolution:**
    *   **Phase 1 (Code Refactor):** Standardize all code identifiers (variables, parameters, function arguments, API request/response fields) to use English (`assemblerId`, `assemblerIds`).
    *   **Phase 2 (Database Refactor):** Consider a database migration to rename the `armadorId` field in the Prisma schema (and underlying database tables) to `assemblerId`. This is a more complex change and should be planned carefully with data migration strategies.
-   **Affected Files/Areas (Initial List - not exhaustive):**
    *   `backend/prisma/schema.prisma`
    *   `backend/routes/armadores.routes.js`
    *   `backend/routes/externalProductionOrders.routes.js`
    *   `backend/routes/externalProductionOrders.test.js`
    *   `frontend/src/pages/LogisticsDashboardPage.jsx`
    *   `frontend/src/pages/ExternalProductionOrderPage.jsx`
    *   `frontend/src/services/externalProductionOrderService.js`
-   **Date Identified:** 2025-11-25