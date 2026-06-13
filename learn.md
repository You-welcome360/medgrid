ctrl +shift + P
Type: TypeScript: Restart TS Server

Example:

{
"name": "@medgrid/gateway",
"version": "1.0.0",
"private": true
}
This says:

This folder is a package named @medgrid/gateway.
It belongs to MEDGRID.
It is private.
For the system, this matters because later Turbo and pnpm can target it:

pnpm --filter @medgrid/gateway dev
or:

pnpm --filter @medgrid/frontend build
Without a package.json, a folder is just a folder.

With a package.json, it becomes a workspace project.

That is the key concept.

What Are Types?

Think of enums as:

Allowed Values

while types define:

Data Shapes

Example:

Enum:

UserRole.FACILITY_ADMIN

Type:

{
id: string;
email: string;
role: UserRole;
}

Remember:

interface CreateFacilityDTO {
email: string;
}

does NOT prevent:

{
"email": "not-an-email"
}

from reaching your API.

That's Zod's job.
