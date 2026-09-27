import { sql } from "drizzle-orm";
import {
  index,
  primaryKey,
  sqliteTableCreator,
  unique,
} from "drizzle-orm/sqlite-core";
import type { AdapterAccount } from "next-auth/adapters";

/**
 * Use the same database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator((name) => `kuraattori_${name}`);

// --- Auth.js ---

export const users = createTable("user", (d) => ({
  id: d
    .text({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.text({ length: 255 }),
  email: d.text({ length: 255 }).notNull(),
  emailVerified: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
  image: d.text({ length: 255 }),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: d.text({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: d.text({ length: 255 }).notNull(),
    providerAccountId: d.text({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.text({ length: 255 }),
    scope: d.text({ length: 255 }),
    id_token: d.text(),
    session_state: d.text({ length: 255 }),
  }),
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const sessions = createTable(
  "session",
  (d) => ({
    sessionToken: d.text({ length: 255 }).notNull().primaryKey(),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    expires: d.integer({ mode: "timestamp" }).notNull(),
  }),
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.text({ length: 255 }).notNull(),
    token: d.text({ length: 255 }).notNull(),
    expires: d.integer({ mode: "timestamp" }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// --- Source tracking ---

export const dataSources = createTable("data_source", (d) => ({
  id: d.integer().primaryKey({ autoIncrement: true }),
  name: d.text().notNull().unique(),
  adapter: d.text().notNull(),
  enabled: d.integer({ mode: "boolean" }).notNull().default(true),
  lastSuccessfulImportAt: d.integer({ mode: "timestamp" }),
  createdAt: d
    .integer({ mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const importRuns = createTable(
  "import_run",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    dataSourceId: d
      .integer()
      .notNull()
      .references(() => dataSources.id),
    startedAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    completedAt: d.integer({ mode: "timestamp" }),
    status: d.text({ enum: ["running", "succeeded", "failed"] }).notNull(),
    itemsFetched: d.integer().notNull().default(0),
    itemsCreated: d.integer().notNull().default(0),
    itemsUpdated: d.integer().notNull().default(0),
    itemsUnchanged: d.integer().notNull().default(0),
    itemsMissing: d.integer().notNull().default(0),
    itemsFailed: d.integer().notNull().default(0),
    errorMessage: d.text(),
  }),
  (t) => [index("import_run_data_source_idx").on(t.dataSourceId)],
);

// --- Museums and exhibitions ---

export const museums = createTable(
  "museum",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    source: d.text().notNull(),
    sourceId: d.text().notNull(),
    name: d.text().notNull(),
    slug: d.text().notNull().unique(),
    city: d.text(),
    region: d.text(),
    address: d.text(),
    latitude: d.real(),
    longitude: d.real(),
    museumCardEligible: d.integer({ mode: "boolean" }).notNull().default(false),
    websiteUrl: d.text(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
    lastSeenAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
  (t) => [unique("museum_source_idx").on(t.source, t.sourceId)],
);

export const exhibitions = createTable(
  "exhibition",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    source: d.text().notNull(),
    sourceId: d.text().notNull(),
    museumId: d
      .integer()
      .notNull()
      .references(() => museums.id),
    slug: d.text().notNull().unique(),
    titleFi: d.text().notNull(),
    titleEn: d.text(),
    titleSv: d.text(),
    descriptionFi: d.text(),
    descriptionEn: d.text(),
    descriptionSv: d.text(),
    startDate: d.text().notNull(),
    endDate: d.text(),
    sourceUrl: d.text(),
    imageUrl: d.text(),
    museumCardEligible: d.integer({ mode: "boolean" }).notNull().default(false),
    sourcePayloadHash: d.text().notNull(),
    /**
     * Same-exhibition-at-several-venues key (normalized title + start + end +
     * description hash), computed by the importer. Null until an import run
     * classifies the row.
     */
    exhibitionGroup: d.text(),
    kind: d
      .text({ enum: ["exhibition", "notice"] })
      .notNull()
      .default("exhibition"),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
    lastFetchedAt: d.integer({ mode: "timestamp" }),
    lastSeenAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
  (t) => [
    unique("exhibition_source_idx").on(t.source, t.sourceId),
    index("exhibition_museum_idx").on(t.museumId),
    index("exhibition_dates_idx").on(t.startDate, t.endDate),
    index("exhibition_group_idx").on(t.exhibitionGroup),
  ],
);

export const categories = createTable(
  "category",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    source: d.text().notNull(),
    sourceId: d.text().notNull(),
    name: d.text().notNull(),
    slug: d.text().notNull().unique(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [unique("category_source_idx").on(t.source, t.sourceId)],
);

export const exhibitionCategories = createTable(
  "exhibition_category",
  (d) => ({
    exhibitionId: d
      .integer()
      .notNull()
      .references(() => exhibitions.id),
    categoryId: d
      .integer()
      .notNull()
      .references(() => categories.id),
  }),
  (t) => [
    primaryKey({ columns: [t.exhibitionId, t.categoryId] }),
    index("exhibition_category_category_idx").on(t.categoryId),
  ],
);

// --- User state ---

export const userInterests = createTable(
  "user_interest",
  (d) => ({
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    categoryId: d
      .integer()
      .notNull()
      .references(() => categories.id),
    weight: d.integer().notNull().default(1),
  }),
  (t) => [primaryKey({ columns: [t.userId, t.categoryId] })],
);

export const userRegions = createTable(
  "user_region",
  (d) => ({
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    region: d.text().notNull(),
  }),
  (t) => [primaryKey({ columns: [t.userId, t.region] })],
);

export const userFollowedMuseums = createTable(
  "user_followed_museum",
  (d) => ({
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    museumId: d
      .integer()
      .notNull()
      .references(() => museums.id),
  }),
  (t) => [primaryKey({ columns: [t.userId, t.museumId] })],
);

export const userExhibitions = createTable(
  "user_exhibition",
  (d) => ({
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    exhibitionId: d
      .integer()
      .notNull()
      .references(() => exhibitions.id),
    status: d.text({ enum: ["interested", "visited", "hidden"] }).notNull(),
    visitedAt: d.integer({ mode: "timestamp" }),
    note: d.text(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    primaryKey({ columns: [t.userId, t.exhibitionId] }),
    index("user_exhibition_status_idx").on(t.userId, t.status),
  ],
);

export const calendarFeeds = createTable("calendar_feed", (d) => ({
  userId: d
    .text({ length: 255 })
    .notNull()
    .primaryKey()
    .references(() => users.id),
  token: d.text().notNull().unique(),
  createdAt: d
    .integer({ mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
}));
