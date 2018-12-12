-- core/sql/structure/core.postgresql.sql

SET client_encoding = 'UTF8';
SET standard_conforming_strings = off;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET escape_string_warning = off;
SET search_path = public, pg_catalog;
SET default_tablespace = '';
SET default_with_oids = false;


DROP TABLE IF EXISTS main_documents;
CREATE TABLE main_documents
(
  id serial NOT NULL,
  reference CHARACTER VARYING(64),
  subject text NOT NULL,
  mode CHARACTER VARYING(16) NOT NULL,
  status INTEGER NOT NULL,
  processing_user INTEGER NOT NULL,
  sender text NOT NULL,
  sender_entity text,
  recipient text,
  priority CHARACTER VARYING(64),
  limit_date timestamp without time zone,
  creation_date timestamp without time zone NOT NULL DEFAULT NOW(),
  modification_date timestamp without time zone DEFAULT NOW(),
  CONSTRAINT main_documents_pkey PRIMARY KEY (id)
)
WITH (OIDS=FALSE);

DROP TABLE IF EXISTS attachments;
CREATE TABLE attachments
(
  id serial NOT NULL,
  main_document_id INTEGER NOT NULL,
  reference character varying(64),
  subject text NOT NULL,
  creation_date timestamp without time zone NOT NULL DEFAULT NOW(),
  modification_date timestamp without time zone DEFAULT NOW(),
  CONSTRAINT attachments_pkey PRIMARY KEY (id)
)
WITH (OIDS=FALSE);

DROP TABLE IF EXISTS status;
CREATE TABLE status
(
  id serial NOT NULL,
  reference character varying(10) NOT NULL,
  label character varying(64) NOT NULL,
  CONSTRAINT status_pkey PRIMARY KEY (id),
  CONSTRAINT status_reference_key UNIQUE (reference)
)
WITH (OIDS=FALSE);

DROP TABLE IF EXISTS actions;
CREATE TABLE actions
(
  id serial NOT NULL,
  label character varying(64) NOT NULL,
  color character varying(8) NOT NULL,
  logo character varying(64),
  event character varying(128) NOT NULL,
  mode CHARACTER VARYING(16) NOT NULL,
  status_id INTEGER NOT NULL,
  next_status_id INTEGER,
  CONSTRAINT actions_pkey PRIMARY KEY (id)
)
WITH (OIDS=FALSE);

DROP TABLE IF EXISTS users;
CREATE TABLE users
(
  id serial NOT NULL,
  email character varying(128) NOT NULL,
  "password" character varying(255) NOT NULL,
  firstname character varying(128) NOT NULL,
  lastname character varying(128) NOT NULL,
  picture text,
  enabled boolean DEFAULT TRUE,
  mode character varying(50) NOT NULL,
  preferences json NOT NULL DEFAULT '{"stylus" : false, "writingSize" : 1, "writingColor" : "#FFFFFF"}',
  cookie_key character varying(255) DEFAULT NULL::character varying,
  cookie_date timestamp without time zone,
  password_modification_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  failed_authentication INTEGER DEFAULT 0,
  locked_until TIMESTAMP without time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_login_key UNIQUE (email)
)
WITH (OIDS=FALSE);

DROP TABLE IF EXISTS groups;
CREATE TABLE groups
(
  id serial NOT NULL,
  label character varying(128) NOT NULL,
  CONSTRAINT groups_pkey PRIMARY KEY (id)
)
WITH (OIDS=FALSE);

DROP TABLE IF EXISTS groups_privileges;
CREATE TABLE groups_privileges
(
  id serial NOT NULL,
  group_id INTEGER NOT NULL,
  privilege character varying(128) NOT NULL,
  CONSTRAINT groups_privileges_pkey PRIMARY KEY (id),
  CONSTRAINT groups_privileges_unique_key UNIQUE (group_id, privilege)
)
WITH (OIDS=FALSE);

DROP TABLE IF EXISTS users_groups;
CREATE TABLE users_groups
(
    id serial NOT NULL,
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    CONSTRAINT users_groups_pkey PRIMARY KEY (id),
    CONSTRAINT users_groups_unique_key UNIQUE (group_id, user_id)
)
WITH (OIDS=FALSE);

DROP TABLE IF EXISTS docservers;
CREATE TABLE docservers
(
  id serial NOT NULL,
  type character varying(32) NOT NULL,
  label character varying(255),
  is_readonly character(1) NOT NULL DEFAULT 'N'::bpchar,
  size_limit_number bigint NOT NULL DEFAULT (0)::bigint,
  actual_size_number bigint NOT NULL DEFAULT (0)::bigint,
  path character varying(255) NOT NULL,
  CONSTRAINT docservers_pkey PRIMARY KEY (id),
  CONSTRAINT docservers_type_key UNIQUE (type)
)
WITH (OIDS=FALSE);

DROP TABLE IF EXISTS adr_main_documents;
CREATE TABLE adr_main_documents
(
  id serial NOT NULL,
  main_document_id INTEGER NOT NULL,
  type character varying(32) NOT NULL,
  path character varying(255) NOT NULL,
  filename character varying(255) NOT NULL,
  fingerprint character varying(255) NOT NULL,
  CONSTRAINT adr_main_documents_pkey PRIMARY KEY (id),
  CONSTRAINT adr_main_documents_unique_key UNIQUE (main_document_id, type)
)
WITH (OIDS=FALSE);

DROP TABLE IF EXISTS adr_attachments;
CREATE TABLE adr_attachments
(
  id serial NOT NULL,
  attachment_id INTEGER NOT NULL,
  type character varying(32) NOT NULL,
  path character varying(255) NOT NULL,
  filename character varying(255) NOT NULL,
  fingerprint character varying(255) NOT NULL,
  CONSTRAINT adr_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT adr_attachments_unique_key UNIQUE (attachment_id, type)
)
WITH (OIDS=FALSE);

DROP TABLE IF EXISTS signatures;
CREATE TABLE signatures
(
  id serial NOT NULL,
  user_id INTEGER NOT NULL,
  path character varying(255) NOT NULL,
  filename character varying(255) NOT NULL,
  fingerprint character varying(255) NOT NULL,
  CONSTRAINT signatures_pkey PRIMARY KEY (id)
)
WITH (OIDS=FALSE);

DROP TABLE IF EXISTS history;
CREATE TABLE history
(
  id serial NOT NULL,
  table_name character varying(64) NOT NULL,
  record_id character varying(32) NOT NULL,
  event_type character varying(32) NOT NULL,
  user_id INTEGER NOT NULL,
  event_date timestamp without time zone NOT NULL,
  info text NOT NULL,
  remote_ip character varying(32) DEFAULT NULL,
  CONSTRAINT history_pkey PRIMARY KEY (id)
)
WITH (OIDS=FALSE);

DROP TABLE IF EXISTS password_rules;
CREATE TABLE password_rules
(
  id serial,
  label character varying(64) NOT NULL,
  "value" INTEGER NOT NULL,
  enabled boolean DEFAULT FALSE NOT NULL,
  CONSTRAINT password_rules_pkey PRIMARY KEY (id),
  CONSTRAINT password_rules_label_key UNIQUE (label)
)
WITH (OIDS=FALSE);

DROP TABLE IF EXISTS password_history;
CREATE TABLE password_history
(
  id serial,
  user_id INTEGER NOT NULL,
  password character varying(255) NOT NULL,
  CONSTRAINT password_history_pkey PRIMARY KEY (id)
)
WITH (OIDS=FALSE);
