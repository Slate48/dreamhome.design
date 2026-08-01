-- 0006_site_settings_logo_on_dark.sql — second logo slot for dark surfaces.
--
-- The admin Site Settings page now uploads logo images to R2 instead of only
-- accepting a pasted URL, and the shared <Logo> component finally renders them
-- (before this, `logo_url` was written to D1 but no surface ever read it).
--
-- Two slots are needed because <Logo> is used on both light and dark surfaces:
--   logo_url          -> light backgrounds: solid navbar, Login, InviteAccept
--   logo_url_on_dark  -> dark backgrounds: transparent hero navbar, Footer,
--                        portal sidebar (<Logo light />)
--
-- A raster/SVG upload cannot recolor itself the way the built-in inline-SVG
-- wordmark does, and cross-falling-back between the two would render a white
-- logo on white (or charcoal on charcoal) — invisible. So a missing slot falls
-- back to the built-in wordmark instead, and the admin UI warns when only one
-- of the two is set.
--
-- Plain ADD COLUMN: nullable, no default, no table rebuild needed.

ALTER TABLE SiteSettings ADD COLUMN logo_url_on_dark TEXT;
