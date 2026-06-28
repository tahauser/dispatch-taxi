--
-- PostgreSQL database dump
--

\restrict SuGWVZ0LV9ICDdYJrW1yFxPaCGMYmfWFFZnl8bg7ebmOpr1KscltijnoNe1i471

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: affectations; Type: TABLE; Schema: public; Owner: dispatch_user
--

CREATE TABLE public.affectations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    trajet_id uuid NOT NULL,
    chauffeur_id uuid NOT NULL,
    date_programme date NOT NULL,
    proposee_par character varying(20) DEFAULT 'systeme'::character varying,
    modifiee_par uuid,
    statut character varying(20) DEFAULT 'proposee'::character varying,
    email_envoye_le timestamp without time zone,
    notes_dispatch text,
    cree_le timestamp without time zone DEFAULT now(),
    modifie_le timestamp without time zone DEFAULT now()
);


ALTER TABLE public.affectations OWNER TO dispatch_user;

--
-- Name: chauffeurs; Type: TABLE; Schema: public; Owner: dispatch_user
--

CREATE TABLE public.chauffeurs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    numero_chauffeur character varying(10) NOT NULL,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    telephone character varying(20),
    adresse_domicile text NOT NULL,
    lat_domicile numeric(10,7),
    lng_domicile numeric(10,7),
    type_vehicule character varying(50) DEFAULT 'TAXI'::character varying,
    actif boolean DEFAULT true,
    mot_de_passe_hash text NOT NULL,
    role character varying(20) DEFAULT 'chauffeur'::character varying,
    cree_le timestamp without time zone DEFAULT now(),
    modifie_le timestamp without time zone DEFAULT now(),
    code_postal character varying(10),
    ville character varying(100),
    province character varying(100) DEFAULT 'Québec'::character varying
);


ALTER TABLE public.chauffeurs OWNER TO dispatch_user;

--
-- Name: consultation_logs; Type: TABLE; Schema: public; Owner: dispatch_user
--

CREATE TABLE public.consultation_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    chauffeur_id uuid NOT NULL,
    date_programme date NOT NULL,
    token text NOT NULL,
    date_consultation timestamp without time zone DEFAULT now(),
    ip_address character varying(100),
    user_agent text
);


ALTER TABLE public.consultation_logs OWNER TO dispatch_user;

--
-- Name: disponibilites; Type: TABLE; Schema: public; Owner: dispatch_user
--

CREATE TABLE public.disponibilites (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    chauffeur_id uuid NOT NULL,
    date_dispo date NOT NULL,
    heure_debut time without time zone NOT NULL,
    heure_fin time without time zone NOT NULL,
    soumis_le timestamp without time zone DEFAULT now(),
    modifie_le timestamp without time zone DEFAULT now(),
    note_journee text
);


ALTER TABLE public.disponibilites OWNER TO dispatch_user;

--
-- Name: envois_email; Type: TABLE; Schema: public; Owner: dispatch_user
--

CREATE TABLE public.envois_email (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    chauffeur_id uuid NOT NULL,
    date_programme date NOT NULL,
    envoye_par uuid,
    envoye_le timestamp without time zone DEFAULT now(),
    nb_trajets integer,
    statut_envoi character varying(20) DEFAULT 'envoye'::character varying,
    erreur text
);


ALTER TABLE public.envois_email OWNER TO dispatch_user;

--
-- Name: gps_logs; Type: TABLE; Schema: public; Owner: dispatch_user
--

CREATE TABLE public.gps_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    chauffeur_id uuid NOT NULL,
    route_id uuid,
    stop_id uuid,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    vitesse_kmh real,
    precision_m real,
    timestamp_device timestamp with time zone NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    event_type character varying(20) DEFAULT 'tracking'::character varying NOT NULL,
    CONSTRAINT gps_logs_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['tracking'::character varying, 'geofence_enter'::character varying, 'geofence_exit'::character varying, 'stop_arrived'::character varying, 'manual'::character varying])::text[]))),
    CONSTRAINT gps_logs_latitude_check CHECK (((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision))),
    CONSTRAINT gps_logs_longitude_check CHECK (((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision)))
);


ALTER TABLE public.gps_logs OWNER TO dispatch_user;

--
-- Name: routes; Type: TABLE; Schema: public; Owner: dispatch_user
--

CREATE TABLE public.routes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    chauffeur_id uuid NOT NULL,
    nom character varying(255) NOT NULL,
    date_planifiee date NOT NULL,
    statut character varying(20) DEFAULT 'planifiee'::character varying NOT NULL,
    heure_debut_reelle timestamp with time zone,
    heure_fin_reelle timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT routes_statut_check CHECK (((statut)::text = ANY ((ARRAY['planifiee'::character varying, 'en_cours'::character varying, 'terminee'::character varying, 'annulee'::character varying])::text[])))
);


ALTER TABLE public.routes OWNER TO dispatch_user;

--
-- Name: stops; Type: TABLE; Schema: public; Owner: dispatch_user
--

CREATE TABLE public.stops (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    route_id uuid NOT NULL,
    ordre integer NOT NULL,
    adresse text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    rayon_geofence_m integer DEFAULT 50 NOT NULL,
    notes text,
    statut character varying(20) DEFAULT 'en_attente'::character varying NOT NULL,
    heure_arrivee_prevue timestamp with time zone,
    heure_arrivee_reelle timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stops_latitude_check CHECK (((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision))),
    CONSTRAINT stops_longitude_check CHECK (((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision))),
    CONSTRAINT stops_rayon_geofence_m_check CHECK (((rayon_geofence_m >= 10) AND (rayon_geofence_m <= 500))),
    CONSTRAINT stops_statut_check CHECK (((statut)::text = ANY ((ARRAY['en_attente'::character varying, 'en_approche'::character varying, 'arrive'::character varying, 'skip'::character varying])::text[])))
);


ALTER TABLE public.stops OWNER TO dispatch_user;

--
-- Name: trajets; Type: TABLE; Schema: public; Owner: dispatch_user
--

CREATE TABLE public.trajets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code_trajet character varying(20) NOT NULL,
    date_trajet date NOT NULL,
    heure_prise time without time zone NOT NULL,
    heure_arrivee time without time zone NOT NULL,
    type_vehicule character varying(50) DEFAULT 'TAXI'::character varying,
    adresse_prise text NOT NULL,
    lat_prise numeric(10,7),
    lng_prise numeric(10,7),
    adresse_arrivee text,
    lat_arrivee numeric(10,7),
    lng_arrivee numeric(10,7),
    code_fixe character varying(20),
    statut character varying(20) DEFAULT 'en_attente'::character varying,
    notes text,
    cree_le timestamp without time zone DEFAULT now(),
    modifie_le timestamp without time zone DEFAULT now()
);


ALTER TABLE public.trajets OWNER TO dispatch_user;

--
-- Data for Name: affectations; Type: TABLE DATA; Schema: public; Owner: dispatch_user
--

COPY public.affectations (id, trajet_id, chauffeur_id, date_programme, proposee_par, modifiee_par, statut, email_envoye_le, notes_dispatch, cree_le, modifie_le) FROM stdin;
0c104200-7132-4951-b382-2f1036a17dea	36cd8eb1-6fc7-4752-a6ee-247ac1294d53	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-07	manuel	\N	proposee	\N	\N	2026-04-22 22:29:38.947526	2026-04-22 22:29:38.947526
36d6b64b-69cd-4f3b-b98b-ec7f5b826658	e4d5bda7-3137-4afb-8962-43258a02359c	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-07	manuel	\N	proposee	\N	\N	2026-04-22 22:29:38.955704	2026-04-22 22:29:38.955704
ad0f704b-4b7f-41c6-8585-43ebd8651d29	2cc0a578-881f-405a-8057-888d2e39c6da	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-07	manuel	\N	proposee	\N	\N	2026-04-22 22:29:38.960849	2026-04-22 22:29:38.960849
b79ce197-a21e-4118-9f24-33ec5f6c4cec	2b39e53f-3197-4e65-9088-0d17c0a0f6a6	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-08	manuel	\N	proposee	\N	\N	2026-04-22 22:29:38.965517	2026-04-22 22:29:38.965517
deea2828-3039-446d-97c8-49ddbd2f5029	96fc2e9b-3a8f-4276-9340-8b7c2350f78e	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-08	manuel	\N	proposee	\N	\N	2026-04-22 22:29:38.969997	2026-04-22 22:29:38.969997
e4121eac-b8fe-4e00-b9ba-5c637fb06b54	705ff0ca-2222-449d-87e5-c2601965d450	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-08	manuel	\N	proposee	\N	\N	2026-04-22 22:29:38.975659	2026-04-22 22:29:38.975659
e97f30dd-9116-477e-9af5-be81fcd4d9b9	096d978d-1633-4a08-95be-55213bef4010	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-08	manuel	\N	proposee	\N	\N	2026-04-22 22:29:38.980505	2026-04-22 22:29:38.980505
1746d9ee-ca9c-4059-9b7c-c7923e7af0d8	d8fc3b7e-52e9-457b-991e-c5a5263dc380	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-09	manuel	\N	proposee	\N	\N	2026-04-22 22:29:38.985522	2026-04-22 22:29:38.985522
f827263f-a4ea-45f7-a4c2-376e5efe2314	a128a378-212c-4e0a-a037-271f8f1f7758	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-10	manuel	\N	proposee	\N	\N	2026-04-22 22:29:38.992367	2026-04-22 22:29:38.992367
47d3cb9d-6991-46a2-9d57-3f93e5592304	869a0ef9-f61a-4ece-82ed-e1610194efa4	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-10	manuel	\N	proposee	\N	\N	2026-04-22 22:29:38.997506	2026-04-22 22:29:38.997506
8e0ae4b2-a4a9-4222-b6ce-872eff5cb930	bd8eed56-5c23-4842-b7f3-1d373f830fd7	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-10	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.001992	2026-04-22 22:29:39.001992
712a73c4-a064-423b-b119-680d0dbd7dc2	686344cc-7525-4b60-a7b3-825a30402528	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-10	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.006932	2026-04-22 22:29:39.006932
f0370f73-7956-44b0-b5b6-1ac63d704942	9282a91f-253c-463b-a603-f048a76ca663	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-11	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.011169	2026-04-22 22:29:39.011169
512a4cba-14c7-4fff-9398-49c23c8422a3	7758b1ba-718c-4df5-bb68-d2b8d233248f	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-13	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.01601	2026-04-22 22:29:39.01601
dea659f1-9d18-4b20-9b27-a5a43dc0d854	c35d8cc3-22b5-495b-8b84-da361a2e264a	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-13	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.020515	2026-04-22 22:29:39.020515
3d2bdb45-0a90-4543-ba96-ac0d2650f911	b946098b-38ba-4cfb-878f-c4dfee91307c	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-14	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.025572	2026-04-22 22:29:39.025572
0482f503-d074-480a-9b4a-2161c512d33a	8948d68e-6d66-4664-9e6d-f01c6f40622e	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-14	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.030455	2026-04-22 22:29:39.030455
2da558f3-192a-4c45-b8b5-a1a4bde681af	5ac53b32-7da4-4d60-ae05-6e0692523437	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-14	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.034896	2026-04-22 22:29:39.034896
95264b5b-7e92-4e24-9089-92b4af4c46e7	03ac7d51-dfdb-43df-8e6b-396e2d09aff7	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-15	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.039314	2026-04-22 22:29:39.039314
66de1153-e708-445a-b663-c3fee83f301d	d6b7e170-df16-43c4-97f2-eefd2720af50	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-16	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.044432	2026-04-22 22:29:39.044432
04815d26-4933-4d61-9fd3-0eb505a53488	f54e0f6f-dad1-4de3-9296-98a6508fa530	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-16	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.048993	2026-04-22 22:29:39.048993
796234e2-0deb-481b-9aec-78fad40c925a	f30932be-6b7c-4f73-938a-72561f3b1457	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-17	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.053884	2026-04-22 22:29:39.053884
e6036db9-8e54-4e3b-99c4-555ec98cbb7f	f55a8c01-33f5-4c7b-98af-41c98730ec0a	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-17	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.059596	2026-04-22 22:29:39.059596
c3588ce1-1ad5-48cd-a0e4-adb09920f1b6	31760bdd-5ab6-4347-b8b5-fa9dee51bb4b	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-20	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.065618	2026-04-22 22:29:39.065618
8da470e3-e895-46fc-90e9-0622d0ffc855	3b3a0c4a-7092-46a3-9874-728c192fb780	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-21	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.073925	2026-04-22 22:29:39.073925
ebe966c0-eadb-47b0-bc22-77ba45d996b0	9edd5417-8166-445b-8a91-b70bc90b81db	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-21	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.078617	2026-04-22 22:29:39.078617
0ac594c0-e645-479e-8538-8c204bf7c066	241973fd-1703-48cf-aded-1373dfbecb8c	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-22	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.083091	2026-04-22 22:29:39.083091
e3bd7df3-a007-4b33-93aa-9d6d80d648c4	7f7237d8-c6db-43cb-bccd-a613b138546a	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-22	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.087411	2026-04-22 22:29:39.087411
8a4142cb-a6e7-415a-8a7d-d4935de4801d	3442cdab-5231-4c1f-a914-f4f8141af8ed	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-22	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.099424	2026-04-22 22:29:39.099424
4e60baba-1ff4-404f-9783-a9c42a36d387	9dd9ec5b-1254-4171-ade1-96699e67b913	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-22	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.104321	2026-04-22 22:29:39.104321
81917e28-cf5a-43cd-acae-66d011f516a5	4836d57b-4b65-49d8-ab36-7e8974f412d7	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-22	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.108947	2026-04-22 22:29:39.108947
d387945b-964d-4c8d-a48d-d2c8fe37e233	045dc5c6-da86-4d61-82d5-96c540ef4b8c	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-23	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.114908	2026-04-22 22:29:39.114908
abb69940-b7bb-40fd-b980-f310c09d601b	f1ee12db-2630-427a-b85a-b884f06dd381	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-23	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.119465	2026-04-22 22:29:39.119465
6ca9eda1-d1db-4db9-b9ca-62779db72263	308dc5ef-c222-4331-ba99-075430b69a70	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-23	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.123714	2026-04-22 22:29:39.123714
db9ae2de-5ea8-477f-9745-ccd05d84a8ae	43ca1a54-a7ac-431b-a94d-f2bbe59ad765	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-24	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.128794	2026-04-22 22:29:39.128794
c5a2fdc1-8aaf-4081-9a35-355018f72cb1	2efc73d5-58df-4519-952a-5672920e7377	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-24	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.133538	2026-04-22 22:29:39.133538
f3fe6fc1-a4ca-43e2-b7d9-282e52d4dc52	5d3bcc5d-598f-402a-b4c1-0e1121199f21	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-24	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.137342	2026-04-22 22:29:39.137342
6f3941b4-11e5-4695-99d6-21df99a86a8d	03fb82bc-3aa8-4314-820f-bbf4a6ecf1d0	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-25	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.141411	2026-04-22 22:29:39.141411
396cab3d-6b76-459a-ba6b-66559f295a38	b03daa74-e0ed-406e-8ff3-23458e91b99f	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-26	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.146331	2026-04-22 22:29:39.146331
829db179-134e-4f19-87d1-0ce89181a95f	4cdd454d-cbab-4fe5-a319-05a25a652eb4	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-27	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.150987	2026-04-22 22:29:39.150987
87794a74-05df-4764-88ee-2bc83de59608	c55363f5-9389-4336-9fd9-233bca67976c	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-27	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.156533	2026-04-22 22:29:39.156533
38b79e02-96af-40bf-aaf6-b6f6404a3f40	6797b57a-29ca-4cbe-b126-1406dd6ba171	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-27	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.161514	2026-04-22 22:29:39.161514
63b9611f-5c2e-470c-8c46-7adea76baa7c	36386b40-b86b-41cc-8401-07dddc6f5062	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-28	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.166693	2026-04-22 22:29:39.166693
fb17d9b0-ed72-4128-9535-67e8eb2a57eb	87d32712-485d-4427-853c-15ca63cb530a	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-29	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.173831	2026-04-22 22:29:39.173831
92e3d726-cfd1-4fbb-884d-af09330badf4	b7e71241-d3bf-486e-a5a6-7f6dce4b42d2	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-29	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.179189	2026-04-22 22:29:39.179189
db41ef5c-ba6f-4133-a8b0-95b955a36bc6	071a840e-35f4-4a96-ad7e-6bb7375d4783	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-29	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.183384	2026-04-22 22:29:39.183384
089897e7-daf8-4a28-8e11-ba6f0bc3512c	378a1cc3-0db3-4d42-8c42-50c8b8abcf3e	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-29	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.188055	2026-04-22 22:29:39.188055
ccf65c5f-1d69-4f44-a44e-670b5e0da266	f038c8a3-9752-45a4-adc8-ee356b0afb5a	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-30	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.192299	2026-04-22 22:29:39.192299
693bc32b-c94e-4813-8ae2-946d3154d6c3	33f26c8d-41a8-487c-808b-75eab54fac26	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-30	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.196657	2026-04-22 22:29:39.196657
d9bc1cc9-18b1-4bb9-b41d-5d4978b75353	bbdb791c-4c86-4489-9871-883eedbc998d	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-30	manuel	\N	proposee	\N	\N	2026-04-22 22:29:39.201343	2026-04-22 22:29:39.201343
e8308d1a-a301-4729-aa91-7cb1fe7fc16e	61015a38-b656-40be-b645-6333c47af4b4	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-06-29	systeme	\N	proposee	\N	\N	2026-06-28 01:42:02.134301	2026-06-28 01:42:02.134301
acae67fa-ea49-4cf6-96d3-484282ef54c9	11ae5724-077e-4663-b287-e24c54fc221e	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-06-29	systeme	\N	proposee	\N	\N	2026-06-28 01:42:02.148952	2026-06-28 01:42:02.148952
47c3b202-ded6-4d78-8751-7561771c8673	e98497fb-82de-4f39-bb95-ab795b29fe6f	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-06-29	systeme	\N	proposee	\N	\N	2026-06-28 01:42:02.153973	2026-06-28 01:42:02.153973
5c3b03c1-4891-4b10-a686-f24d87a7729b	66434ef2-23c7-4615-9e27-7451e78bff20	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-06-29	systeme	\N	proposee	\N	\N	2026-06-28 01:42:02.162992	2026-06-28 01:42:02.162992
51e25210-ea2e-4754-be6e-a6a3620cf0b1	624366af-40d1-4b7e-bb33-37bd5828048d	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-06-29	systeme	\N	proposee	\N	\N	2026-06-28 01:42:02.168066	2026-06-28 01:42:02.168066
fee1f511-9cb7-46e5-8299-5e493a8d8dda	aba580c6-d86e-4996-b8f2-03d62fc2f2f8	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-06-29	systeme	\N	proposee	\N	\N	2026-06-28 01:42:02.172571	2026-06-28 01:42:02.172571
066315d8-5366-4f2e-bde6-e99c31c63d5c	3dca3c21-0ebb-4e7b-b463-849b61ac1509	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-06-29	systeme	\N	proposee	\N	\N	2026-06-28 01:42:02.177779	2026-06-28 01:42:02.177779
71b13c2a-afeb-4bb2-93e5-f8e83b61d910	6f3eafb4-6fef-463b-a0ae-0583d4d09ec4	ac57e90e-f690-4506-9246-12b2896daf12	2026-06-29	systeme	\N	proposee	\N	\N	2026-06-28 01:42:02.182766	2026-06-28 01:42:02.182766
10d8eef3-1325-4978-be20-f3fc1e22130d	abdab84f-3853-4cd5-b150-dd29230e96de	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-06-29	systeme	\N	proposee	\N	\N	2026-06-28 01:42:02.187682	2026-06-28 01:42:02.187682
34a57538-52a4-4b9b-8d54-28956710fb59	e561260c-c39a-4720-ac40-58cd5fccdd6c	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-06-29	systeme	\N	proposee	\N	\N	2026-06-28 01:42:02.192336	2026-06-28 01:42:02.192336
bd27ccb9-e9f6-47a2-b70a-969b6de46da6	6ae595fa-8d43-4a27-ae61-3dee1b94b1a1	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-06-29	systeme	\N	proposee	\N	\N	2026-06-28 01:42:02.196932	2026-06-28 01:42:02.196932
1a3c2268-db72-4ec7-8488-9f622da33611	61c64ac8-a37e-4f96-9f63-c786d70a2f65	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-06-29	systeme	\N	proposee	\N	\N	2026-06-28 01:42:02.201514	2026-06-28 01:42:02.201514
de2fe079-2f9c-42e8-9221-35704d12b414	c6883310-6136-429b-a51e-3a60df7795d2	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-06-29	systeme	\N	proposee	\N	\N	2026-06-28 01:42:02.213383	2026-06-28 01:42:02.213383
3a49fa3f-9b5b-4f06-ad79-31b53a18771a	abbe142c-c3cc-44ad-a506-c33f0959de27	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-06-29	systeme	\N	proposee	\N	\N	2026-06-28 01:42:02.218182	2026-06-28 01:42:02.218182
deb5da0c-5c07-4d7f-8070-bbafbbb9ff4d	7d33dfaf-7bad-4dde-85fb-069d6aa5dd62	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-06-29	systeme	\N	proposee	\N	\N	2026-06-28 01:42:02.228507	2026-06-28 01:42:02.228507
\.


--
-- Data for Name: chauffeurs; Type: TABLE DATA; Schema: public; Owner: dispatch_user
--

COPY public.chauffeurs (id, numero_chauffeur, nom, prenom, email, telephone, adresse_domicile, lat_domicile, lng_domicile, type_vehicule, actif, mot_de_passe_hash, role, cree_le, modifie_le, code_postal, ville, province) FROM stdin;
6c4efa13-53d2-47fb-a8b2-f1c504c31156	000	Admin	Dispatch	tadilihatim+000@gmail.com	\N	500 Boul. Cremazie Est, Montreal	\N	\N	TAXI	t	$2a$10$mgj6s1nF7dUOUYCzqZePBunudLccor0x8N4U4vrKbUl64xspfkCKO	dispatch	2026-03-28 14:25:13.059415	2026-03-28 14:25:13.059415	\N	\N	Québec
f8aa0514-4755-40d8-95b7-41eb5df66a2d	009	Tadili	Hatim	tadilihatim+009@gmail.com	514-384-1830	1630 Chemin des Prairies	45.4385598	-73.4794114	TAXI	t	$2a$10$xKv8JrmZGr98n49Uz4Bq7eMxHLhXsxTblrXCZKisj7oMMMOow8eg2	chauffeur	2026-03-28 14:27:28.025683	2026-06-27 22:13:15.401972	J4X 1G3	Brossard	Québec
2fb8af64-bf43-46d3-9053-5fd673a68c2a	012	Dubois	Marc	tadilihatim+012@gmail.com	514-555-0012	450 Rue Principale	45.6889000	-73.4342000	TAXI	t	$2a$10$i6xcNDj0BpZ/6jEODP.czeNZsrcPYCK0Tf04my3s80CTicuYqZYPi	chauffeur	2026-03-28 14:27:28.471365	2026-03-28 14:27:28.471365	J3X 1S1	Varennes	Québec
fd4bc826-7b37-476f-be0f-a00dc64fc4ae	015	Tremblay	Sophie	tadilihatim+015@gmail.com	514-555-0015	200 Boul Sir-Wilfrid-Laurier	45.5667000	-73.2000000	BERLINE	t	$2a$10$zPehZEUcG4DeKMLPh5Rvy.sl7aDqXXvk7i8bX.xA7yK/y8GAtw5Qm	chauffeur	2026-03-28 14:27:28.588547	2026-03-28 14:27:28.588547	J3G 4J1	Beloeil	Québec
88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	021	Gagnon	Pierre	tadilihatim+021@gmail.com	514-555-0021	750 Rue Ampère	45.5975000	-73.4344000	TAXI	t	$2a$10$HGZDnLypnYAlxjThrZj6e.jFjQWXVEf8lDUmSlnxX7M/qINqD.zfW	chauffeur	2026-03-28 14:27:28.708134	2026-03-28 14:27:28.708134	J4B 7M5	Boucherville	Québec
ac57e90e-f690-4506-9246-12b2896daf12	034	Roy	Marie	tadilihatim+034@gmail.com	514-555-0034	320 Rue Sainte-Anne	45.5897000	-73.3333000	TAXI	t	$2a$10$YMmId23ojBj9DX0HdHt37uf94OGa.OCkN4Lx72Shvh91IVNe6HT9m	chauffeur	2026-03-28 14:27:28.847849	2026-03-28 14:27:28.847849	J3E 0E1	Sainte-Julie	Québec
5df0dd59-c2f6-4075-8d43-c82892209c90	041	Belanger	Luc	tadilihatim+041@gmail.com	514-555-0041	1100 Rue du Parc	45.5378000	-73.3622000	TAXI	t	$2a$10$A062LRGXNQmXZ5IFdcH/e.i7k5gPybt9jkljU9JlbD8XVGlRgtAgC	chauffeur	2026-03-28 14:27:28.98232	2026-03-28 14:27:28.98232	J3V 2A1	Saint-Bruno-de-Montarville	Québec
e2f8c134-2778-45ed-803d-ab40d7db761b	055	Cote	Julie	tadilihatim+055@gmail.com	514-555-0055	580 Rue Notre-Dame	45.4989000	-73.5114000	BERLINE	t	$2a$10$S/yLgInf/MNQc9j3bS.5VedAK0DSKvRiG4zCr.knkC2.z.Kesytxu	chauffeur	2026-03-28 14:27:29.115067	2026-03-28 14:27:29.115067	J4P 2K8	Saint-Lambert	Québec
\.


--
-- Data for Name: consultation_logs; Type: TABLE DATA; Schema: public; Owner: dispatch_user
--

COPY public.consultation_logs (id, chauffeur_id, date_programme, token, date_consultation, ip_address, user_agent) FROM stdin;
\.


--
-- Data for Name: disponibilites; Type: TABLE DATA; Schema: public; Owner: dispatch_user
--

COPY public.disponibilites (id, chauffeur_id, date_dispo, heure_debut, heure_fin, soumis_le, modifie_le, note_journee) FROM stdin;
524e49ac-e67f-4ab2-9551-85baf63999fb	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2029-06-29	06:00:00	12:00:00	2026-06-26 19:03:12.133997	2026-06-26 19:03:12.133997	\N
c00ec173-73d9-4c23-8efe-f28f797698a8	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2029-06-29	14:00:00	22:00:00	2026-06-26 19:03:12.143924	2026-06-26 19:03:12.143924	\N
23c06bcc-2b56-483d-9351-1f92ad3f8008	5df0dd59-c2f6-4075-8d43-c82892209c90	2029-06-29	10:00:00	19:00:00	2026-06-26 19:03:12.150536	2026-06-26 19:03:12.150536	\N
1fdd36cf-e2cc-4c95-9dde-2732e4b323b9	e2f8c134-2778-45ed-803d-ab40d7db761b	2029-06-29	07:00:00	11:00:00	2026-06-26 19:03:12.154865	2026-06-26 19:03:12.154865	\N
cd977ab6-feb0-4ead-8898-cb691d23ae47	e2f8c134-2778-45ed-803d-ab40d7db761b	2029-06-29	18:00:00	23:00:00	2026-06-26 19:03:12.16817	2026-06-26 19:03:12.16817	\N
379fdf50-d01d-4f39-af1f-4d7f99545b0c	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-06-27	08:00:00	19:00:00	2026-06-27 03:22:49.329166	2026-06-27 03:22:49.329166	\N
ab558959-4398-42ac-8b4f-326467c96043	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-06-27	18:00:00	22:00:00	2026-06-27 03:25:59.087662	2026-06-27 03:25:59.087662	\N
539efd5c-8a57-44a7-876d-71374ef86b81	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-06-27	05:45:00	10:00:00	2026-06-27 03:25:59.375756	2026-06-27 03:25:59.375756	\N
c7240d60-fc85-4f7e-b90a-f4e5536a443f	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-06-28	10:00:00	14:00:00	2026-06-27 03:25:59.671951	2026-06-27 03:25:59.671951	\N
184ea268-7f8a-4b04-8d9e-8d2dd822635a	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-06-28	16:45:00	22:00:00	2026-06-27 03:25:59.954687	2026-06-27 03:25:59.954687	\N
1bafafde-8019-4e16-aa2a-bba2f2f24ff6	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-06-29	10:45:00	15:00:00	2026-06-27 03:26:00.253311	2026-06-27 03:26:00.253311	\N
ccf425f9-54e9-457e-b165-d320999ac510	ac57e90e-f690-4506-9246-12b2896daf12	2026-06-29	17:00:00	23:30:00	2026-06-27 03:26:00.543963	2026-06-27 03:26:00.543963	\N
0860283b-cd6b-4aee-9a5a-b185a26840b6	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-06-30	07:00:00	11:30:00	2026-06-27 03:26:00.838734	2026-06-27 03:26:00.838734	\N
c95beff3-65cc-4ae4-81db-c12bfb56cd94	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-06-30	06:15:00	09:00:00	2026-06-27 03:26:01.141901	2026-06-27 03:26:01.141901	\N
ce8d3288-fc2d-4cb0-b126-e22a5da060a5	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-06-30	05:45:00	10:00:00	2026-06-27 03:26:01.494525	2026-06-27 03:26:01.494525	\N
b2487553-d508-49ad-8ac4-795c2bea7fdb	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-01	06:00:00	17:00:00	2026-06-27 03:26:01.814312	2026-06-27 03:26:01.814312	\N
d50d6a19-f978-495d-998d-4f1534a2846a	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-01	10:00:00	14:00:00	2026-06-27 03:26:02.110289	2026-06-27 03:26:02.110289	\N
fefa25a8-e7af-4794-95c4-b352a34275a0	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-01	17:00:00	22:00:00	2026-06-27 03:26:02.430814	2026-06-27 03:26:02.430814	\N
614150fb-5f89-4bf9-9b86-f94226f4f21d	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-02	05:45:00	09:00:00	2026-06-27 03:26:02.722337	2026-06-27 03:26:02.722337	\N
6b6aef52-0276-491d-bf1d-7ac66a67f06a	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-02	19:15:00	23:00:00	2026-06-27 03:26:03.017063	2026-06-27 03:26:03.017063	\N
f2f6242f-9546-4a51-9ccc-19dcf255d142	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-02	17:15:00	22:00:00	2026-06-27 03:26:03.307003	2026-06-27 03:26:03.307003	\N
ed3a030d-7d26-4bab-b770-cbd79c7754a3	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-03	10:00:00	14:00:00	2026-06-27 03:26:03.591279	2026-06-27 03:26:03.591279	\N
e125a17c-8708-4eee-ab37-155409e5ab64	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-03	06:00:00	17:00:00	2026-06-27 03:26:03.873851	2026-06-27 03:26:03.873851	\N
3b9c8d0f-3887-4f01-83ac-4e55a484fdff	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-04	10:00:00	14:00:00	2026-06-27 03:26:04.166742	2026-06-27 03:26:04.166742	\N
52f6543c-095f-46ae-a18e-3c0c17134aee	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-04	06:00:00	10:00:00	2026-06-27 03:26:04.450055	2026-06-27 03:26:04.450055	\N
b9c45dc0-ac2e-4695-8278-bb3444262692	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-05	13:00:00	21:00:00	2026-06-27 03:26:04.741055	2026-06-27 03:26:04.741055	\N
c5e29f29-66c7-42e8-858a-737fc50111ab	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-06	07:00:00	11:30:00	2026-06-27 03:26:05.025715	2026-06-27 03:26:05.025715	\N
d2e85526-f1d8-48c4-931c-67a0a01ecafe	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-06	13:00:00	21:00:00	2026-06-27 03:26:05.311746	2026-06-27 03:26:05.311746	\N
174969a9-7847-49d1-9df7-80a25884b6b0	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-06	17:00:00	22:00:00	2026-06-27 03:26:05.59652	2026-06-27 03:26:05.59652	\N
0aa78353-b26c-4035-bbaa-1032c7cebb5b	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-07	19:00:00	23:00:00	2026-06-27 03:26:05.879764	2026-06-27 03:26:05.879764	\N
afba555b-021c-4d2c-8d5a-678836a8c4a6	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-07	06:00:00	10:00:00	2026-06-27 03:26:06.171184	2026-06-27 03:26:06.171184	\N
a67f8053-8a64-4c63-9353-2392ce3c3d77	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-08	14:00:00	19:00:00	2026-06-27 03:26:06.387506	2026-06-27 03:26:06.387506	\N
f4cab0fd-83cb-4ab8-bfcd-2414caf86617	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-08	11:15:00	15:00:00	2026-06-27 03:26:06.614996	2026-06-27 03:26:06.614996	\N
a8bb37c5-003b-453f-8fc8-33f4248de55c	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-08	10:00:00	14:00:00	2026-06-27 03:26:06.806646	2026-06-27 03:26:06.806646	\N
a5a0917a-aaf4-4934-a65f-48d9985740b1	ac57e90e-f690-4506-9246-12b2896daf12	2026-07-08	17:00:00	23:30:00	2026-06-27 03:26:06.971869	2026-06-27 03:26:06.971869	\N
b244a766-dfb2-428d-a140-f3a8ef0e852e	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-08	17:00:00	22:00:00	2026-06-27 03:26:07.113465	2026-06-27 03:26:07.113465	\N
4ffa5c89-ef9c-426f-b86c-861753ac8e2c	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-09	13:45:00	19:00:00	2026-06-27 03:26:07.255459	2026-06-27 03:26:07.255459	\N
a1e1ecb7-548e-4106-8df3-ee90cdd7f6b7	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-09	05:45:00	09:00:00	2026-06-27 03:26:07.398081	2026-06-27 03:26:07.398081	\N
015331ac-c904-4495-a3bc-1d4393761901	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-09	18:15:00	22:00:00	2026-06-27 03:26:07.539536	2026-06-27 03:26:07.539536	\N
13581bbf-e39a-4d9f-9785-ba0324eb6a57	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-09	18:45:00	23:00:00	2026-06-27 03:26:07.679487	2026-06-27 03:26:07.679487	\N
67994995-b480-4a1f-8df8-b83ec2267cd3	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-09	05:45:00	17:00:00	2026-06-27 03:26:07.822468	2026-06-27 03:26:07.822468	\N
540d8ab3-40ff-4a6f-90fc-9b7edf579f49	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-09	17:00:00	22:00:00	2026-06-27 03:26:07.96641	2026-06-27 03:26:07.96641	\N
7bc2a340-2b64-4822-b9b8-a3d1242e8bf9	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-10	13:45:00	19:00:00	2026-06-27 03:26:08.108994	2026-06-27 03:26:08.108994	\N
66607176-1476-466e-9d3f-e31b1d012b31	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-10	19:00:00	23:00:00	2026-06-27 03:26:08.25072	2026-06-27 03:26:08.25072	\N
d5f3833b-8135-4533-87c2-2734c2e03ff0	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-10	11:00:00	15:00:00	2026-06-27 03:26:08.397761	2026-06-27 03:26:08.397761	\N
8ec4fe27-7aad-4569-b23e-0825f6459934	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-10	10:00:00	14:00:00	2026-06-27 03:26:08.539459	2026-06-27 03:26:08.539459	\N
5f11a94b-278c-4b98-b9bb-9de3bf5c2588	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-10	06:00:00	17:00:00	2026-06-27 03:26:08.684745	2026-06-27 03:26:08.684745	\N
3de707b9-32d9-4546-8c41-7a1fe07bb661	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-11	06:00:00	09:00:00	2026-06-27 03:26:08.927137	2026-06-27 03:26:08.927137	\N
c78b6bec-e55b-4210-80cf-765d31f22c17	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-11	17:45:00	22:00:00	2026-06-27 03:26:09.075155	2026-06-27 03:26:09.075155	\N
af9cc29e-9645-46d5-b50b-59919b94c10d	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-11	18:45:00	23:00:00	2026-06-27 03:26:09.217847	2026-06-27 03:26:09.217847	\N
00d13bc4-d5fc-4405-bada-243c74420328	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-11	06:00:00	17:00:00	2026-06-27 03:26:09.373588	2026-06-27 03:26:09.373588	\N
9b7abeb7-5436-44b8-bec2-b720a7be205f	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-11	16:45:00	22:00:00	2026-06-27 03:26:09.516329	2026-06-27 03:26:09.516329	\N
a7b5e8c6-9bb7-45e3-b1ef-482fc0faf678	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-12	19:00:00	23:00:00	2026-06-27 03:26:09.662081	2026-06-27 03:26:09.662081	\N
2c8575d7-af48-4927-b72d-4330b17a17bc	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-12	19:15:00	23:00:00	2026-06-27 03:26:09.806817	2026-06-27 03:26:09.806817	\N
ec5ad2e5-7030-4a68-9db6-43196d83dcee	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-12	05:45:00	10:00:00	2026-06-27 03:26:09.952154	2026-06-27 03:26:09.952154	\N
660d8f1b-3c8f-4dd1-9a57-cdabc56d389a	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-13	07:15:00	11:30:00	2026-06-27 03:26:10.095592	2026-06-27 03:26:10.095592	\N
81be0b9a-2d0b-4c4b-b44a-1cdfbd90aeb8	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-13	06:00:00	09:00:00	2026-06-27 03:26:10.262621	2026-06-27 03:26:10.262621	\N
a0ad71ab-75f2-4fd0-bbc1-13c6330c8598	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-13	18:00:00	22:00:00	2026-06-27 03:26:10.404922	2026-06-27 03:26:10.404922	\N
65e186f1-9f4d-4ab8-8706-a607ac3575b2	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-13	19:00:00	23:00:00	2026-06-27 03:26:10.548385	2026-06-27 03:26:10.548385	\N
8001bd54-0616-4a15-828b-f1a46b9b0bfc	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-13	05:45:00	17:00:00	2026-06-27 03:26:10.691613	2026-06-27 03:26:10.691613	\N
456d6014-17bb-41b3-a472-69f298776915	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-13	17:15:00	22:00:00	2026-06-27 03:26:10.834758	2026-06-27 03:26:10.834758	\N
de437732-6dd9-454c-a204-1db10f9cbbf2	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-14	13:45:00	19:00:00	2026-06-27 03:26:10.978628	2026-06-27 03:26:10.978628	\N
ef64e685-b045-4f8a-aa7a-fd50df7a9a9e	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-14	19:15:00	23:00:00	2026-06-27 03:26:11.122618	2026-06-27 03:26:11.122618	\N
5d906812-ad61-431f-a5e7-ff6cf2282561	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-14	19:00:00	23:00:00	2026-06-27 03:26:11.263708	2026-06-27 03:26:11.263708	\N
acaac355-747f-4c95-8aa6-66e488639d99	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-14	06:15:00	10:00:00	2026-06-27 03:26:11.405519	2026-06-27 03:26:11.405519	\N
0dd4c4f1-2adc-4a32-988e-e7a34c7bc4fb	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-15	07:15:00	11:30:00	2026-06-27 03:26:11.547686	2026-06-27 03:26:11.547686	\N
9fc59693-ae5a-4916-b6ed-5d68afb7b603	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-15	09:45:00	14:00:00	2026-06-27 03:26:11.690423	2026-06-27 03:26:11.690423	\N
c9d9befb-d1ed-4ba3-98fd-0983bb0aa299	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-15	10:00:00	14:00:00	2026-06-27 03:26:11.831669	2026-06-27 03:26:11.831669	\N
c08d7e6f-9896-473d-914a-3cdcd4420aeb	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-15	10:00:00	14:00:00	2026-06-27 03:26:12.031034	2026-06-27 03:26:12.031034	\N
5ace005f-f25f-439d-8236-f0ad19a60967	ac57e90e-f690-4506-9246-12b2896daf12	2026-07-15	17:00:00	23:30:00	2026-06-27 03:26:12.218398	2026-06-27 03:26:12.218398	\N
bdbc3f6a-acda-4627-a4fc-f7d793177da5	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-15	17:00:00	22:00:00	2026-06-27 03:26:12.359439	2026-06-27 03:26:12.359439	\N
331ed623-a526-4c5a-9720-8202a326e672	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-16	13:45:00	19:00:00	2026-06-27 03:26:12.502728	2026-06-27 03:26:12.502728	\N
64390ab2-d06a-4572-88e1-6eb9d606a5b9	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-16	18:45:00	23:00:00	2026-06-27 03:26:12.644595	2026-06-27 03:26:12.644595	\N
6451c4f9-3d53-4b63-b23e-1bd02efe4cb6	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-16	11:00:00	15:00:00	2026-06-27 03:26:12.786003	2026-06-27 03:26:12.786003	\N
10b70b45-a463-4e94-b6be-e0ee21fd16e3	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-16	13:00:00	21:00:00	2026-06-27 03:26:12.92833	2026-06-27 03:26:12.92833	\N
3f5274b1-6522-4a10-afb8-db637bb11cc8	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-16	06:00:00	17:00:00	2026-06-27 03:26:13.069211	2026-06-27 03:26:13.069211	\N
1729b482-8d0f-4703-82ad-da00f51d193b	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-16	17:15:00	22:00:00	2026-06-27 03:26:13.211321	2026-06-27 03:26:13.211321	\N
28db915d-9239-4f48-84fa-e2ca1982e5ca	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-17	13:45:00	19:00:00	2026-06-27 03:26:13.353373	2026-06-27 03:26:13.353373	\N
f06f31df-373f-4d96-b378-d4ddbe449988	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-17	06:00:00	09:00:00	2026-06-27 03:26:13.494128	2026-06-27 03:26:13.494128	\N
6aad3a93-9a73-4620-85e9-f733ee3cafb6	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-17	18:00:00	22:00:00	2026-06-27 03:26:13.634991	2026-06-27 03:26:13.634991	\N
b860ec90-d022-493c-9737-7e9265fe8f65	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-17	19:00:00	23:00:00	2026-06-27 03:26:13.778195	2026-06-27 03:26:13.778195	\N
c902c29f-45af-4feb-a1ea-58f82a9bc817	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-06-29	06:00:00	12:00:00	2026-06-26 19:03:37.903606	2026-06-26 19:03:37.903606	\N
175d5507-9220-45ef-b22d-95dd6bd45d33	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-06-29	14:00:00	22:00:00	2026-06-26 19:03:37.909937	2026-06-26 19:03:37.909937	\N
fb6ec893-27e0-452c-bde3-d294a00a1b20	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-06-29	10:00:00	19:00:00	2026-06-26 19:03:37.914313	2026-06-26 19:03:37.914313	\N
57feea3a-3d57-4f6c-87ff-a11d3fb66c25	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-06-29	07:00:00	11:00:00	2026-06-26 19:03:37.919012	2026-06-26 19:03:37.919012	\N
7ad263b4-407d-44de-a1eb-cd6a74d88765	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-06-29	18:00:00	23:00:00	2026-06-26 19:03:37.926425	2026-06-26 19:03:37.926425	\N
085d88ac-dbc4-4322-ac7e-e83156f4e56c	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-06-27	05:45:00	17:00:00	2026-06-27 03:25:58.867123	2026-06-27 03:25:58.867123	\N
c4d28184-ff86-4a6f-b971-c2b9b44c25e8	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-06-27	12:45:00	21:00:00	2026-06-27 03:25:59.159104	2026-06-27 03:25:59.159104	\N
85f85ae6-c965-4908-bf70-81da6faf162f	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-06-27	17:00:00	22:00:00	2026-06-27 03:25:59.447326	2026-06-27 03:25:59.447326	\N
11d01afc-e9fa-4efc-85ad-1eec32d69f7c	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-06-28	19:00:00	23:00:00	2026-06-27 03:25:59.742673	2026-06-27 03:25:59.742673	\N
7fff0d9c-e324-47e5-835c-52509ad21550	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-06-29	06:45:00	11:30:00	2026-06-27 03:26:00.029726	2026-06-27 03:26:00.029726	\N
f884a18a-9c31-4787-b856-f1e7af6ecd91	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-06-29	18:00:00	22:00:00	2026-06-27 03:26:00.323691	2026-06-27 03:26:00.323691	\N
21887c30-b8f3-4baf-b163-ddf6d8bcd03f	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-06-29	06:15:00	17:00:00	2026-06-27 03:26:00.618348	2026-06-27 03:26:00.618348	\N
93f36055-29ab-4c9b-ab7a-a39fd0ea0fb7	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-06-30	14:00:00	19:00:00	2026-06-27 03:26:00.917295	2026-06-27 03:26:00.917295	\N
f1c7d3e3-4f97-420d-96c4-cd04f4545683	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-06-30	11:15:00	15:00:00	2026-06-27 03:26:01.215692	2026-06-27 03:26:01.215692	\N
69539486-2091-4a0f-b8d7-22a3a081216f	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-06-30	17:00:00	22:00:00	2026-06-27 03:26:01.59341	2026-06-27 03:26:01.59341	\N
5f56ecf6-410d-4409-87d4-e68e35f6f839	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-01	06:15:00	09:00:00	2026-06-27 03:26:01.888338	2026-06-27 03:26:01.888338	\N
338a3a13-5490-47ae-a0ca-68b7a937d8a6	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-01	19:00:00	23:00:00	2026-06-27 03:26:02.183808	2026-06-27 03:26:02.183808	\N
ed720101-f6bd-4947-94b3-a31d7ebdc81b	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-02	07:00:00	11:30:00	2026-06-27 03:26:02.505886	2026-06-27 03:26:02.505886	\N
6d2ee182-9ffa-4c74-87e0-e83e38eb2e2e	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-02	11:00:00	15:00:00	2026-06-27 03:26:02.797324	2026-06-27 03:26:02.797324	\N
c3770ad7-f307-4ea6-9a12-35918b7bb055	ac57e90e-f690-4506-9246-12b2896daf12	2026-07-02	17:00:00	23:30:00	2026-06-27 03:26:03.094094	2026-06-27 03:26:03.094094	\N
fa7672b2-d797-4c01-8c13-080ec9f27d50	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-03	06:45:00	11:30:00	2026-06-27 03:26:03.378101	2026-06-27 03:26:03.378101	\N
aaeea636-debc-46e4-b12c-1f61ee176724	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-03	19:00:00	23:00:00	2026-06-27 03:26:03.66252	2026-06-27 03:26:03.66252	\N
5c2901a3-aaaa-4df4-ac7a-81ecd3f30443	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-04	05:45:00	17:00:00	2026-06-27 03:26:03.946246	2026-06-27 03:26:03.946246	\N
36a5854b-74da-464d-9d99-beeb68ec5cee	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-04	19:00:00	23:00:00	2026-06-27 03:26:04.238197	2026-06-27 03:26:04.238197	\N
74caacd7-8030-4646-bd8e-1a9e9084ea5b	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-04	17:00:00	22:00:00	2026-06-27 03:26:04.520912	2026-06-27 03:26:04.520912	\N
c2dc16e9-eecc-4da2-81e9-bb0647fe82b8	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-05	06:00:00	17:00:00	2026-06-27 03:26:04.810991	2026-06-27 03:26:04.810991	\N
d6b40a31-5ec0-46f8-b2c7-ffdeda232f0e	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-06	14:00:00	19:00:00	2026-06-27 03:26:05.096441	2026-06-27 03:26:05.096441	\N
ca4e370c-b362-455c-974d-0a442bfde8db	ac57e90e-f690-4506-9246-12b2896daf12	2026-07-06	17:00:00	23:30:00	2026-06-27 03:26:05.382186	2026-06-27 03:26:05.382186	\N
f385ffea-cc08-4360-9e56-9ba5bfed273d	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-07	06:45:00	11:30:00	2026-06-27 03:26:05.667107	2026-06-27 03:26:05.667107	\N
a000344b-67e9-460f-b03a-ae60c4cd5103	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-07	10:00:00	14:00:00	2026-06-27 03:26:05.953003	2026-06-27 03:26:05.953003	\N
24020bf8-b400-41b4-80a0-7bf75bff4582	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-07	17:00:00	22:00:00	2026-06-27 03:26:06.243699	2026-06-27 03:26:06.243699	\N
6bffc626-65e8-40f0-9d9b-03219bf07df2	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-08	05:45:00	17:00:00	2026-06-27 03:26:06.457959	2026-06-27 03:26:06.457959	\N
4546e4f4-2c8d-4882-853d-15d819f821c6	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-08	18:15:00	22:00:00	2026-06-27 03:26:06.73191	2026-06-27 03:26:06.73191	\N
dc520d5d-41fc-43f8-a688-2db5832a0285	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-08	18:45:00	23:00:00	2026-06-27 03:26:06.898437	2026-06-27 03:26:06.898437	\N
cac870a3-fde5-4ef4-b7fd-111c42515e99	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-08	06:00:00	10:00:00	2026-06-27 03:26:07.042594	2026-06-27 03:26:07.042594	\N
a85adffe-29f6-4f59-a9c7-1256a8557af3	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-09	07:15:00	11:30:00	2026-06-27 03:26:07.185049	2026-06-27 03:26:07.185049	\N
a6c7ce50-7acb-4363-a203-b2aaaab16c68	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-09	06:00:00	17:00:00	2026-06-27 03:26:07.326852	2026-06-27 03:26:07.326852	\N
083fa274-bf99-429c-9035-457fc5dc5da1	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-09	11:00:00	15:00:00	2026-06-27 03:26:07.468924	2026-06-27 03:26:07.468924	\N
cb030565-ac7f-492c-81fb-a9621468449b	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-09	09:45:00	14:00:00	2026-06-27 03:26:07.609335	2026-06-27 03:26:07.609335	\N
38f33420-fb06-4636-b467-5844b3875b63	ac57e90e-f690-4506-9246-12b2896daf12	2026-07-09	17:15:00	23:30:00	2026-06-27 03:26:07.750958	2026-06-27 03:26:07.750958	\N
74f92107-2fb2-4c43-9c96-c8d249ff0711	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-09	06:00:00	10:00:00	2026-06-27 03:26:07.893906	2026-06-27 03:26:07.893906	\N
3616ffe7-94ce-484e-b308-1e534dcbb97f	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-10	06:45:00	11:30:00	2026-06-27 03:26:08.037761	2026-06-27 03:26:08.037761	\N
b3e7d9a6-140a-4ce1-8d48-df6d1cb01177	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-10	09:45:00	14:00:00	2026-06-27 03:26:08.180265	2026-06-27 03:26:08.180265	\N
f39c48cd-4d61-4cb1-95a3-f0863f3649ca	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-10	06:15:00	09:00:00	2026-06-27 03:26:08.322608	2026-06-27 03:26:08.322608	\N
86f775f5-e1c9-4c3b-8c02-7ded87984470	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-10	18:00:00	22:00:00	2026-06-27 03:26:08.468766	2026-06-27 03:26:08.468766	\N
8d50420a-0456-499d-afe9-ffb1dc905b1b	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-10	19:00:00	23:00:00	2026-06-27 03:26:08.612184	2026-06-27 03:26:08.612184	\N
fd30f09f-5ec2-434f-9bd0-f89c1255f10b	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-11	05:45:00	17:00:00	2026-06-27 03:26:08.757674	2026-06-27 03:26:08.757674	\N
54c4475f-b9f8-41ca-84e4-8ee122a07069	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-11	11:00:00	15:00:00	2026-06-27 03:26:08.997969	2026-06-27 03:26:08.997969	\N
12f2871f-d179-417f-86f1-0e2fe98499ba	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-11	10:00:00	14:00:00	2026-06-27 03:26:09.147196	2026-06-27 03:26:09.147196	\N
685dab73-9b79-4502-af77-6b41723668fb	ac57e90e-f690-4506-9246-12b2896daf12	2026-07-11	17:15:00	23:30:00	2026-06-27 03:26:09.303031	2026-06-27 03:26:09.303031	\N
d94ba341-3c16-4d44-a74e-8dc93b731b7f	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-11	06:00:00	10:00:00	2026-06-27 03:26:09.444147	2026-06-27 03:26:09.444147	\N
acb21543-00b3-4a2b-9d16-97125dc016be	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-12	10:00:00	14:00:00	2026-06-27 03:26:09.586702	2026-06-27 03:26:09.586702	\N
c15ab970-bafb-4995-ba45-471c5548bfb0	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-12	10:00:00	14:00:00	2026-06-27 03:26:09.736023	2026-06-27 03:26:09.736023	\N
1094dad5-b107-4be8-84ea-284a74d183c5	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-12	06:15:00	17:00:00	2026-06-27 03:26:09.877914	2026-06-27 03:26:09.877914	\N
6830e9ce-11ea-4001-9bc7-749419c2a6e0	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-12	16:45:00	22:00:00	2026-06-27 03:26:10.0234	2026-06-27 03:26:10.0234	\N
99b1079c-514d-4711-9796-cdff6e976363	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-13	13:45:00	19:00:00	2026-06-27 03:26:10.167212	2026-06-27 03:26:10.167212	\N
f1ce0ce2-6915-4929-a051-87ec3ea6eb6b	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-13	11:00:00	15:00:00	2026-06-27 03:26:10.333711	2026-06-27 03:26:10.333711	\N
6de4e804-de1f-4f57-96c5-2c73bef60222	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-13	10:15:00	14:00:00	2026-06-27 03:26:10.47709	2026-06-27 03:26:10.47709	\N
0c2d927b-6162-4b39-9007-d9bfd59e1197	ac57e90e-f690-4506-9246-12b2896daf12	2026-07-13	17:15:00	23:30:00	2026-06-27 03:26:10.620645	2026-06-27 03:26:10.620645	\N
87d335c0-e268-499c-8fc9-2d8bc5a2391f	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-13	06:15:00	10:00:00	2026-06-27 03:26:10.76331	2026-06-27 03:26:10.76331	\N
b15bb6a8-4260-4623-b038-3ffc15a25e55	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-14	07:00:00	11:30:00	2026-06-27 03:26:10.908136	2026-06-27 03:26:10.908136	\N
d0a0bd90-3e45-4f97-bf9b-365aa778f11c	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-14	10:00:00	14:00:00	2026-06-27 03:26:11.051033	2026-06-27 03:26:11.051033	\N
66f020bb-60b5-4fd3-a039-6dbd250bfde1	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-14	09:45:00	14:00:00	2026-06-27 03:26:11.193648	2026-06-27 03:26:11.193648	\N
6252fcb2-a402-490b-b4b9-47cf01d78803	ac57e90e-f690-4506-9246-12b2896daf12	2026-07-14	16:45:00	23:30:00	2026-06-27 03:26:11.334879	2026-06-27 03:26:11.334879	\N
d509e3cf-3a6d-4156-8c87-08997e3343ae	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-14	16:45:00	22:00:00	2026-06-27 03:26:11.476917	2026-06-27 03:26:11.476917	\N
a8e66954-debc-4d7c-8ea7-97f5c2279224	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-15	13:45:00	19:00:00	2026-06-27 03:26:11.619713	2026-06-27 03:26:11.619713	\N
7679feed-fb7a-4e6f-8efe-8bf14602a9d8	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-15	19:00:00	23:00:00	2026-06-27 03:26:11.760627	2026-06-27 03:26:11.760627	\N
78fb21fb-a399-4ed7-9377-d9489722341d	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-15	18:45:00	23:00:00	2026-06-27 03:26:11.933589	2026-06-27 03:26:11.933589	\N
5b6a47d0-46ac-4c58-b18b-bb692994ba1f	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-15	19:00:00	23:00:00	2026-06-27 03:26:12.14837	2026-06-27 03:26:12.14837	\N
bd8fd3dc-cf00-439e-baa8-93a68199fa38	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-15	05:45:00	10:00:00	2026-06-27 03:26:12.288484	2026-06-27 03:26:12.288484	\N
0bcafe38-0a81-4f45-a58e-e8ff23c9a820	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-16	07:15:00	11:30:00	2026-06-27 03:26:12.430354	2026-06-27 03:26:12.430354	\N
1b1988e3-ad80-4d97-b230-b1e539229e6a	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-16	10:00:00	14:00:00	2026-06-27 03:26:12.573665	2026-06-27 03:26:12.573665	\N
d9906620-214e-45ca-ac3d-71ba30533d7f	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-16	06:00:00	09:00:00	2026-06-27 03:26:12.715227	2026-06-27 03:26:12.715227	\N
b60cc109-53db-4cab-bd3c-517248a6cc70	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-16	18:15:00	22:00:00	2026-06-27 03:26:12.855757	2026-06-27 03:26:12.855757	\N
fcf071f7-da70-4587-9323-cacc7568f924	ac57e90e-f690-4506-9246-12b2896daf12	2026-07-16	16:45:00	23:30:00	2026-06-27 03:26:12.998672	2026-06-27 03:26:12.998672	\N
f05a36bf-dd7c-48a0-a520-e3cbb932593f	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-16	06:15:00	10:00:00	2026-06-27 03:26:13.140015	2026-06-27 03:26:13.140015	\N
146d7c46-d749-443c-8dae-fcf821c12863	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-17	07:00:00	11:30:00	2026-06-27 03:26:13.28305	2026-06-27 03:26:13.28305	\N
37c69f70-abb6-4565-affb-1be6f636a573	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-17	06:00:00	17:00:00	2026-06-27 03:26:13.423163	2026-06-27 03:26:13.423163	\N
8280b5d7-13fd-4562-8f7d-feed3d28f940	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-17	11:00:00	15:00:00	2026-06-27 03:26:13.564665	2026-06-27 03:26:13.564665	\N
2c9fec7a-ead0-45ce-9e73-963e2cc3ec37	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-17	10:00:00	14:00:00	2026-06-27 03:26:13.705306	2026-06-27 03:26:13.705306	\N
cb8e04b1-b07a-4ab8-8e18-c3acc7c21428	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-17	05:45:00	17:00:00	2026-06-27 03:26:13.848839	2026-06-27 03:26:13.848839	\N
c7398c20-e165-4f2e-ac8e-cdb07e5f6abc	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-12	06:00:00	13:00:00	2026-06-26 20:11:30.412585	2026-06-26 20:11:30.412585	\N
fad39835-0342-4674-8d93-0ec5eda25359	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-06-27	06:00:00	09:00:00	2026-06-27 03:25:58.93966	2026-06-27 03:25:58.93966	\N
e84fe354-cbdc-41c7-9f7f-25fb4e215ba8	ac57e90e-f690-4506-9246-12b2896daf12	2026-06-27	17:15:00	23:30:00	2026-06-27 03:25:59.23072	2026-06-27 03:25:59.23072	\N
8f210828-a5d2-4b08-8ef8-3aa2871e6c28	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-06-28	10:15:00	14:00:00	2026-06-27 03:25:59.51928	2026-06-27 03:25:59.51928	\N
8acb4def-2124-4343-a5a0-219aa416e2cb	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-06-28	06:00:00	17:00:00	2026-06-27 03:25:59.81342	2026-06-27 03:25:59.81342	\N
327ac753-23fb-47e2-a2ca-3058f3e1db52	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-06-29	14:00:00	19:00:00	2026-06-27 03:26:00.102213	2026-06-27 03:26:00.102213	\N
b0f909db-5b21-4a02-b848-bae188984512	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-06-29	10:00:00	14:00:00	2026-06-27 03:26:00.39535	2026-06-27 03:26:00.39535	\N
eff27243-56e6-4933-a28b-cd197173dc1a	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-06-29	06:15:00	10:00:00	2026-06-27 03:26:00.692108	2026-06-27 03:26:00.692108	\N
edaaf44a-1f0f-45ec-84f6-c765f8dc24bd	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-06-30	10:15:00	14:00:00	2026-06-27 03:26:00.994138	2026-06-27 03:26:00.994138	\N
4fe6355d-5c01-47c6-8e98-3477484f2454	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-06-30	18:00:00	22:00:00	2026-06-27 03:26:01.289155	2026-06-27 03:26:01.289155	\N
cd77741b-cd71-45bc-8c88-47c78da8ab87	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-01	07:00:00	11:30:00	2026-06-27 03:26:01.666331	2026-06-27 03:26:01.666331	\N
6fb6dd2d-7647-4d94-91e9-e84de0142531	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-01	11:00:00	15:00:00	2026-06-27 03:26:01.961401	2026-06-27 03:26:01.961401	\N
c1a3e4f2-aea9-4e04-b596-182aa4b0f4a4	ac57e90e-f690-4506-9246-12b2896daf12	2026-07-01	17:00:00	23:30:00	2026-06-27 03:26:02.257047	2026-06-27 03:26:02.257047	\N
ddb5b8a6-0d48-4327-8a7d-89aa4dc98bbc	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-02	14:00:00	19:00:00	2026-06-27 03:26:02.577916	2026-06-27 03:26:02.577916	\N
b4fbb493-be0c-4e8d-904f-f6792875b8c2	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-02	18:00:00	22:00:00	2026-06-27 03:26:02.869107	2026-06-27 03:26:02.869107	\N
bf0cd7c9-c691-450e-a7d0-c790273f96b5	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-02	06:00:00	17:00:00	2026-06-27 03:26:03.165729	2026-06-27 03:26:03.165729	\N
50a168bf-90d3-4171-964d-e319165d0098	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-03	14:15:00	19:00:00	2026-06-27 03:26:03.448668	2026-06-27 03:26:03.448668	\N
aed8a913-7516-41e3-a8c8-60f5aba22006	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-03	10:15:00	14:00:00	2026-06-27 03:26:03.732693	2026-06-27 03:26:03.732693	\N
82a5d4a9-93af-4ba9-9e1c-8fd162e86478	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-04	10:00:00	14:00:00	2026-06-27 03:26:04.020536	2026-06-27 03:26:04.020536	\N
ae552ab7-8fe5-4622-8bb9-1c18d0c69a5c	ac57e90e-f690-4506-9246-12b2896daf12	2026-07-04	17:00:00	23:30:00	2026-06-27 03:26:04.30894	2026-06-27 03:26:04.30894	\N
1cc241b3-6996-4d1d-995a-1f7000e0e10e	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-05	10:00:00	14:00:00	2026-06-27 03:26:04.590893	2026-06-27 03:26:04.590893	\N
b414c8c4-3285-45a3-a13c-a8edac5f392c	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-05	06:00:00	10:00:00	2026-06-27 03:26:04.881917	2026-06-27 03:26:04.881917	\N
3a828510-89e7-4c27-9393-4e7ee454ff27	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-06	10:00:00	14:00:00	2026-06-27 03:26:05.168033	2026-06-27 03:26:05.168033	\N
b16872f2-05d6-444b-a776-e619efa4c7f2	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-06	06:00:00	17:00:00	2026-06-27 03:26:05.455491	2026-06-27 03:26:05.455491	\N
3d329009-1d1d-4157-a629-a19f7259fc97	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-07	07:00:00	17:00:00	2026-04-22 22:29:38.13184	2026-04-22 22:29:38.13184	Disponible seulement le matin
4add30fd-b895-42e4-9169-a8e47c4fbdb5	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-08	07:00:00	13:00:00	2026-04-22 22:29:38.137527	2026-04-22 22:29:38.137527	\N
d2c4dcae-645a-485d-8a60-cce13624bec1	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-09	12:00:00	20:00:00	2026-04-22 22:29:38.146891	2026-04-22 22:29:38.146891	\N
92b1597d-3f5c-4286-8ccc-0758a0cbbc7a	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-10	08:00:00	17:00:00	2026-04-22 22:29:38.151438	2026-04-22 22:29:38.151438	\N
1cbd2dcc-d5cb-4ad7-a1c2-5dcb6fd6740d	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-13	12:00:00	17:00:00	2026-04-22 22:29:38.156686	2026-04-22 22:29:38.156686	\N
61ebc2d9-9d2b-4089-a37d-88f05e2e42ad	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-14	07:00:00	17:00:00	2026-04-22 22:29:38.160944	2026-04-22 22:29:38.160944	\N
4acc9d20-0df7-4f16-b091-cc3279cc7e64	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-16	06:00:00	16:00:00	2026-04-22 22:29:38.165128	2026-04-22 22:29:38.165128	Zone Rive-Sud uniquement
958184af-9c79-45e6-b936-231e52779a64	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-17	12:00:00	17:00:00	2026-04-22 22:29:38.169238	2026-04-22 22:29:38.169238	Disponible seulement le matin
eb3b4f91-932b-4893-beba-14c38d5f01b9	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-20	12:00:00	22:00:00	2026-04-22 22:29:38.173919	2026-04-22 22:29:38.173919	Zone Rive-Sud uniquement
f7a1d09c-eeaa-4e1a-b7f6-56f6ba956f2f	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-21	06:00:00	12:00:00	2026-04-22 22:29:38.178671	2026-04-22 22:29:38.178671	\N
b483c712-54c6-4b4b-bfc6-363529fb0799	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-21	14:00:00	20:00:00	2026-04-22 22:29:38.18272	2026-04-22 22:29:38.18272	\N
afc92881-e23f-4892-a9da-901154b6e042	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-22	06:00:00	14:00:00	2026-04-22 22:29:38.195114	2026-04-22 22:29:38.195114	\N
b27daa0a-e89b-4212-9011-2a044d1dcb18	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-27	10:00:00	17:00:00	2026-04-22 22:29:38.199679	2026-04-22 22:29:38.199679	Disponible toute la journée
90f90489-08e5-4292-a1ff-ddcd2c9d146c	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-29	06:00:00	14:00:00	2026-04-22 22:29:38.204178	2026-04-22 22:29:38.204178	\N
9c6064fa-5d9d-4669-82f5-95d281a1b6d0	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-30	06:00:00	11:00:00	2026-04-22 22:29:38.209892	2026-04-22 22:29:38.209892	\N
afc8b9f5-2705-49f5-9f12-ca9f02a68ce8	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-04-30	16:00:00	21:00:00	2026-04-22 22:29:38.21645	2026-04-22 22:29:38.21645	\N
46a121b9-6ed7-45ed-92a4-a94b3adadc86	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-07	09:00:00	11:00:00	2026-04-22 22:29:38.221515	2026-04-22 22:29:38.221515	\N
8a134415-cd54-4660-81da-e3f8efcdbb69	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-07	16:00:00	18:00:00	2026-04-22 22:29:38.225693	2026-04-22 22:29:38.225693	\N
ffb13e93-45be-4edb-9418-32bd0c2cad16	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-08	12:00:00	16:00:00	2026-04-22 22:29:38.231866	2026-04-22 22:29:38.231866	Disponible toute la journée
3f226594-0805-4a73-898a-06c7df4224e8	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-09	07:00:00	12:00:00	2026-04-22 22:29:38.236115	2026-04-22 22:29:38.236115	Disponible seulement le matin
c25a221a-9d8b-4663-8666-bcb7adb8d68c	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-09	15:00:00	19:00:00	2026-04-22 22:29:38.240137	2026-04-22 22:29:38.240137	Disponible seulement le matin
9131f058-a389-4fbc-a3c7-dc1205af696a	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-10	09:00:00	14:00:00	2026-04-22 22:29:38.245006	2026-04-22 22:29:38.245006	Préfère les trajets courts
63539165-55da-4313-b7b3-219d007990e9	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-11	08:00:00	13:00:00	2026-04-22 22:29:38.249135	2026-04-22 22:29:38.249135	Pas de longue distance
ee0d7e41-12b6-45fb-acd4-153e9eb81850	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-13	10:00:00	15:00:00	2026-04-22 22:29:38.253329	2026-04-22 22:29:38.253329	\N
95d307e5-cf01-4de2-95f6-6edf1e312afd	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-14	07:00:00	12:00:00	2026-04-22 22:29:38.257543	2026-04-22 22:29:38.257543	\N
b473e3c4-b4ff-420b-8b64-01f1a6007e50	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-15	06:00:00	10:00:00	2026-04-22 22:29:38.263617	2026-04-22 22:29:38.263617	Disponible seulement le matin
1f1f7571-66cb-4066-9306-19b23e22645d	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-16	07:00:00	10:00:00	2026-04-22 22:29:38.26877	2026-04-22 22:29:38.26877	\N
11a36cad-f0ef-4c9a-87de-52446754478c	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-16	13:00:00	19:00:00	2026-04-22 22:29:38.274337	2026-04-22 22:29:38.274337	\N
48138321-888f-4c46-8a92-82211e12df33	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-17	11:00:00	19:00:00	2026-04-22 22:29:38.279948	2026-04-22 22:29:38.279948	\N
c6037582-64c7-41ed-a8e6-069b15673911	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-20	13:00:00	17:00:00	2026-04-22 22:29:38.284481	2026-04-22 22:29:38.284481	\N
a5a5d43f-b8f5-4fec-9f90-9c7705aae88a	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-21	11:00:00	18:00:00	2026-04-22 22:29:38.288538	2026-04-22 22:29:38.288538	Préfère les trajets courts
30349fe9-54bd-4e22-b804-57e7f521f1da	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-23	06:00:00	11:00:00	2026-04-22 22:29:38.293857	2026-04-22 22:29:38.293857	\N
a4943703-be63-49fa-8cb2-3f4d2a800e10	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-24	07:00:00	12:00:00	2026-04-22 22:29:38.297839	2026-04-22 22:29:38.297839	Préfère les trajets courts
079d8cb6-2123-427b-8605-10ea1e8b8355	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-25	08:00:00	11:00:00	2026-04-22 22:29:38.302148	2026-04-22 22:29:38.302148	Zone Rive-Sud uniquement
b569c236-1e31-443d-aaef-c28f5659618c	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-25	14:00:00	19:00:00	2026-04-22 22:29:38.307124	2026-04-22 22:29:38.307124	Zone Rive-Sud uniquement
52492a0a-6136-45cb-9993-a54a3f564a76	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-27	06:00:00	15:00:00	2026-04-22 22:29:38.311138	2026-04-22 22:29:38.311138	Disponible seulement le matin
a684fc96-eac5-4bec-ae17-9331a42eaa8e	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-28	07:00:00	13:00:00	2026-04-22 22:29:38.31588	2026-04-22 22:29:38.31588	\N
a40ae6d3-84da-47c6-89ef-6c488b125522	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-28	16:00:00	20:00:00	2026-04-22 22:29:38.320858	2026-04-22 22:29:38.320858	\N
c0c5fdc0-9ffc-473e-b090-901efb50fc4d	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-29	09:00:00	14:00:00	2026-04-22 22:29:38.324886	2026-04-22 22:29:38.324886	Préfère les trajets courts
452297dc-8a22-4d49-8b3b-2806cfb2573c	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-04-30	13:00:00	18:00:00	2026-04-22 22:29:38.329025	2026-04-22 22:29:38.329025	Disponible toute la journée
89887fb8-2092-4eaf-836e-1a0dc76626d6	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-07	11:00:00	19:00:00	2026-04-22 22:29:38.334625	2026-04-22 22:29:38.334625	Zone Rive-Sud uniquement
96d81773-08de-4510-8386-8c76aec3b953	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-08	12:00:00	17:00:00	2026-04-22 22:29:38.338815	2026-04-22 22:29:38.338815	\N
e15dfbf6-b0b4-4ffc-a58d-e0a645fdb51a	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-09	06:00:00	12:00:00	2026-04-22 22:29:38.343155	2026-04-22 22:29:38.343155	\N
8aacc486-4215-4d98-adf6-cf7c0e7f31b6	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-09	13:00:00	16:00:00	2026-04-22 22:29:38.348708	2026-04-22 22:29:38.348708	\N
830fe84f-06c8-4ee4-9b71-3dfdd75389e4	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-10	09:00:00	15:00:00	2026-04-22 22:29:38.353702	2026-04-22 22:29:38.353702	\N
42fb7209-13a0-46b9-8a18-f80b3057c463	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-11	09:00:00	12:00:00	2026-04-22 22:29:38.359722	2026-04-22 22:29:38.359722	\N
e3bc5a2c-4f58-43fc-8307-aee1fa44d741	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-11	16:00:00	20:00:00	2026-04-22 22:29:38.363687	2026-04-22 22:29:38.363687	\N
62ab2b25-0f36-4316-8558-5511e5f81e9c	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-07	14:00:00	19:00:00	2026-06-27 03:26:05.737575	2026-06-27 03:26:05.737575	\N
e23fddff-864f-400b-858d-5c324f59443b	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-07	18:45:00	23:00:00	2026-06-27 03:26:06.025722	2026-06-27 03:26:06.025722	\N
21dd87f5-7651-4460-9153-a5e887c5d1fc	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-08	07:00:00	11:30:00	2026-06-27 03:26:06.315999	2026-06-27 03:26:06.315999	\N
ad4a4321-e5d7-47f1-b87a-81258c54eafd	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-08	05:45:00	09:00:00	2026-06-27 03:26:06.529633	2026-06-27 03:26:06.529633	\N
dc0b92d2-2b37-4828-bdd7-901fbb38f666	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-14	08:00:00	12:00:00	2026-04-22 22:29:38.368019	2026-04-22 22:29:38.368019	Disponible seulement le matin
de5a97e3-6dfc-43ec-9ec9-7e38b72000ac	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-14	13:00:00	18:00:00	2026-04-22 22:29:38.373484	2026-04-22 22:29:38.373484	Disponible seulement le matin
7c7b8fae-5033-49ac-98f3-a446abeabf3e	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-15	07:00:00	12:00:00	2026-04-22 22:29:38.377952	2026-04-22 22:29:38.377952	\N
78428b8d-13a8-4400-a0f3-f30e229ebfdf	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-15	14:00:00	19:00:00	2026-04-22 22:29:38.384826	2026-04-22 22:29:38.384826	\N
72b5a080-309d-4778-8d13-aef5586f8a07	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-17	06:00:00	12:00:00	2026-04-22 22:29:38.389409	2026-04-22 22:29:38.389409	Disponible seulement le matin
740beb09-2088-439d-84ff-5ef31ad32385	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-20	07:00:00	16:00:00	2026-04-22 22:29:38.39428	2026-04-22 22:29:38.39428	\N
5a73a4e2-c7cc-473a-aea8-88f4a00aabfe	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-21	09:00:00	11:00:00	2026-04-22 22:29:38.398874	2026-04-22 22:29:38.398874	Zone Rive-Sud uniquement
26da467d-c2ee-496d-91f4-af10ad0bcf46	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-21	13:00:00	18:00:00	2026-04-22 22:29:38.403651	2026-04-22 22:29:38.403651	Zone Rive-Sud uniquement
71829372-14c1-4610-a438-42a9cb54c2a6	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-22	12:00:00	19:00:00	2026-04-22 22:29:38.408851	2026-04-22 22:29:38.408851	\N
94f9103d-e3d1-4158-a78c-3c4bcb78707d	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-23	07:00:00	13:00:00	2026-04-22 22:29:38.413192	2026-04-22 22:29:38.413192	\N
0267c5d1-ad78-4978-81a0-2e6e24858e34	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-24	11:00:00	18:00:00	2026-04-22 22:29:38.417788	2026-04-22 22:29:38.417788	Préfère les trajets courts
d59fa0f0-bae2-418b-b541-f4fc2bba5aaa	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-27	12:00:00	17:00:00	2026-04-22 22:29:38.422136	2026-04-22 22:29:38.422136	\N
b5d3c50f-07d5-49bd-8510-675384ef605c	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-28	10:00:00	17:00:00	2026-04-22 22:29:38.427169	2026-04-22 22:29:38.427169	Disponible seulement le matin
0a9f917d-dcc4-45b7-b46e-2cc46d62910b	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-29	09:00:00	12:00:00	2026-04-22 22:29:38.432156	2026-04-22 22:29:38.432156	\N
02ac3ecd-68b7-4390-8f98-9f3de1ff8e26	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-29	15:00:00	21:00:00	2026-04-22 22:29:38.435934	2026-04-22 22:29:38.435934	\N
08c4bd66-4a7e-4572-bb83-c0009d83f226	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-04-30	09:00:00	14:00:00	2026-04-22 22:29:38.440485	2026-04-22 22:29:38.440485	\N
31eda4ae-2ff5-4e84-874b-8ab85ded93f9	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-07	06:00:00	12:00:00	2026-04-22 22:29:38.446078	2026-04-22 22:29:38.446078	Disponible seulement le matin
db9a93e9-0b2b-4861-b2d0-a5a1a8e51d3a	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-08	07:00:00	15:00:00	2026-04-22 22:29:38.450366	2026-04-22 22:29:38.450366	Zone Rive-Sud uniquement
8c58fd72-413b-4c95-ac05-935a9c99e1b1	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-09	13:00:00	21:00:00	2026-04-22 22:29:38.454752	2026-04-22 22:29:38.454752	Zone Rive-Sud uniquement
c4aa2fc5-66fd-44e4-9537-74eaf51f268b	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-10	12:00:00	19:00:00	2026-04-22 22:29:38.459956	2026-04-22 22:29:38.459956	\N
df2f9d06-579b-40ff-9f0d-9d842dd9d4bb	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-13	13:00:00	21:00:00	2026-04-22 22:29:38.465006	2026-04-22 22:29:38.465006	\N
6a86d01a-d613-4087-8489-86e7866459c8	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-14	07:00:00	15:00:00	2026-04-22 22:29:38.469184	2026-04-22 22:29:38.469184	Disponible seulement le matin
b29f9820-9b31-441b-8408-aa24cc04dc2e	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-16	11:00:00	15:00:00	2026-04-22 22:29:38.473809	2026-04-22 22:29:38.473809	Disponible toute la journée
e25d71af-eeea-4e14-b243-8a1280b61e03	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-18	12:00:00	18:00:00	2026-04-22 22:29:38.479147	2026-04-22 22:29:38.479147	Disponible toute la journée
7f20412f-a6c6-48a7-a9be-e562d2052c3a	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-20	08:00:00	12:00:00	2026-04-22 22:29:38.484106	2026-04-22 22:29:38.484106	\N
4230f49e-bf3e-496b-a95b-0c91e51f6a7e	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-20	14:00:00	18:00:00	2026-04-22 22:29:38.488464	2026-04-22 22:29:38.488464	\N
b68dd592-f4b5-44ca-9730-b562d9043c34	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-24	07:00:00	16:00:00	2026-04-22 22:29:38.493301	2026-04-22 22:29:38.493301	\N
03435abb-bc55-4867-b657-9f122000a867	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-26	07:00:00	10:00:00	2026-04-22 22:29:38.498687	2026-04-22 22:29:38.498687	\N
772372ce-bfe7-4920-9fb4-3c7986c99a84	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-26	15:00:00	17:00:00	2026-04-22 22:29:38.503364	2026-04-22 22:29:38.503364	\N
ce906319-67ef-446e-a940-ba754d260449	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-27	08:00:00	14:00:00	2026-04-22 22:29:38.508874	2026-04-22 22:29:38.508874	\N
aa4f373f-f9c6-4167-b9c7-3f4cee2b567e	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-28	06:00:00	16:00:00	2026-04-22 22:29:38.514332	2026-04-22 22:29:38.514332	\N
fac92384-8bdd-496b-a337-4795f479c7d2	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-29	10:00:00	19:00:00	2026-04-22 22:29:38.519359	2026-04-22 22:29:38.519359	Disponible seulement le matin
c565ab0b-ef26-434c-be03-7bdee5e99d8b	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-04-30	06:00:00	16:00:00	2026-04-22 22:29:38.524685	2026-04-22 22:29:38.524685	\N
0fded800-7c1e-44f4-970e-b4d9324c76e8	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-07	06:00:00	12:00:00	2026-04-22 22:29:38.528918	2026-04-22 22:29:38.528918	\N
303ae95f-4c2f-4223-9d38-39e42465275a	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-08	13:00:00	17:00:00	2026-04-22 22:29:38.532826	2026-04-22 22:29:38.532826	\N
587a23a9-9267-42fc-abc7-30f23faedd54	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-09	09:00:00	18:00:00	2026-04-22 22:29:38.537358	2026-04-22 22:29:38.537358	Préfère les trajets courts
2bc1ba6b-c799-4c65-8073-13195d54a6f9	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-11	08:00:00	18:00:00	2026-04-22 22:29:38.541752	2026-04-22 22:29:38.541752	Zone Rive-Sud uniquement
5dd760ff-3c94-4445-94da-14b73fe6040e	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-13	12:00:00	22:00:00	2026-04-22 22:29:38.546106	2026-04-22 22:29:38.546106	Pas de longue distance
6a29f698-da8b-494d-bc6c-bf419f26c003	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-14	06:00:00	11:00:00	2026-04-22 22:29:38.550172	2026-04-22 22:29:38.550172	\N
e6f2ad41-5db9-4ac1-a486-22dbb682578c	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-15	07:00:00	15:00:00	2026-04-22 22:29:38.562886	2026-04-22 22:29:38.562886	Disponible toute la journée
28dc6012-47b5-48c6-bad2-b7182afb59d2	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-16	07:00:00	14:00:00	2026-04-22 22:29:38.567778	2026-04-22 22:29:38.567778	Préfère les trajets courts
6e051cd1-7728-40b6-90c7-075a0d0a0e35	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-17	12:00:00	22:00:00	2026-04-22 22:29:38.572104	2026-04-22 22:29:38.572104	\N
f1a4f7b6-cbdb-48ea-84de-09a5f9832763	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-18	06:00:00	10:00:00	2026-04-22 22:29:38.575945	2026-04-22 22:29:38.575945	Disponible toute la journée
5053ffba-dbff-447a-bd94-a25d9018364d	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-18	13:00:00	15:00:00	2026-04-22 22:29:38.580265	2026-04-22 22:29:38.580265	Disponible toute la journée
825c1662-5cea-4054-bb06-fbef572cfbca	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-19	07:00:00	09:00:00	2026-04-22 22:29:38.585024	2026-04-22 22:29:38.585024	\N
e6a54931-8f1a-4a87-9619-3338004db93a	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-19	16:00:00	19:00:00	2026-04-22 22:29:38.593458	2026-04-22 22:29:38.593458	\N
65353371-1a19-46c7-b6e4-444afc127a95	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-20	08:00:00	18:00:00	2026-04-22 22:29:38.598867	2026-04-22 22:29:38.598867	Pas de longue distance
b78d85d1-da32-4f4a-a32b-29d994c13211	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-21	08:00:00	14:00:00	2026-04-22 22:29:38.603116	2026-04-22 22:29:38.603116	\N
4328a529-6edc-42dd-a43e-145ea6b59102	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-23	12:00:00	18:00:00	2026-04-22 22:29:38.607528	2026-04-22 22:29:38.607528	Disponible toute la journée
0f594f4b-330b-458c-9337-fd45d0a669b2	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-24	08:00:00	13:00:00	2026-04-22 22:29:38.611842	2026-04-22 22:29:38.611842	\N
2aa27d53-a8b6-4e9a-87db-84fb2b42b3bc	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-24	13:00:00	17:00:00	2026-04-22 22:29:38.617959	2026-04-22 22:29:38.617959	\N
b8adae6a-05ce-41b2-99b6-92d7deb8c156	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-26	13:00:00	20:00:00	2026-04-22 22:29:38.62295	2026-04-22 22:29:38.62295	\N
91702f24-91ec-4101-b03f-6d8fce1bb448	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-27	12:00:00	17:00:00	2026-04-22 22:29:38.628167	2026-04-22 22:29:38.628167	\N
766f6fe5-c06c-4942-aa4e-3a01c8353f96	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-28	13:00:00	21:00:00	2026-04-22 22:29:38.633355	2026-04-22 22:29:38.633355	\N
7a57e0b9-e349-4cbb-83ba-92ab516dfd82	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-29	08:00:00	12:00:00	2026-04-22 22:29:38.638179	2026-04-22 22:29:38.638179	Préfère les trajets courts
260dc4d3-c61d-4953-a161-849572494dfb	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-29	16:00:00	20:00:00	2026-04-22 22:29:38.643017	2026-04-22 22:29:38.643017	Préfère les trajets courts
0e013937-ebd4-41be-bdb6-6944155b97fd	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-04-30	09:00:00	16:00:00	2026-04-22 22:29:38.647177	2026-04-22 22:29:38.647177	\N
f39a8208-5db5-4fc4-b6e5-53f39d3d64e6	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-08	10:00:00	20:00:00	2026-04-22 22:29:38.651909	2026-04-22 22:29:38.651909	Disponible seulement le matin
3df02830-823c-4ba1-a073-8f6241e99b5c	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-09	13:00:00	22:00:00	2026-04-22 22:29:38.658121	2026-04-22 22:29:38.658121	\N
5a391336-cccb-47c8-b7d4-dd9b11a4f809	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-10	07:00:00	11:00:00	2026-04-22 22:29:38.663092	2026-04-22 22:29:38.663092	\N
e1f7c212-4444-4723-a778-e57381305314	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-10	16:00:00	19:00:00	2026-04-22 22:29:38.66724	2026-04-22 22:29:38.66724	\N
409955af-8a81-4832-bc36-5f7373b74275	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-13	09:00:00	14:00:00	2026-04-22 22:29:38.671541	2026-04-22 22:29:38.671541	Disponible toute la journée
47c2ca48-c6f3-4857-b690-125dd79db854	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-14	09:00:00	12:00:00	2026-04-22 22:29:38.675706	2026-04-22 22:29:38.675706	Disponible toute la journée
638010bd-52c0-45b4-b8c5-95454e49b2df	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-14	14:00:00	17:00:00	2026-04-22 22:29:38.681697	2026-04-22 22:29:38.681697	Disponible toute la journée
1a8e29cf-ab1e-4991-a115-eeff97f7d4ee	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-15	09:00:00	19:00:00	2026-04-22 22:29:38.686512	2026-04-22 22:29:38.686512	Zone Rive-Sud uniquement
ea72eeed-3ef0-48c7-941f-d13ce80160cd	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-16	06:00:00	11:00:00	2026-04-22 22:29:38.690709	2026-04-22 22:29:38.690709	\N
4de14b38-5ed4-4667-90ee-97c3a8fff177	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-21	07:00:00	11:00:00	2026-04-22 22:29:38.695633	2026-04-22 22:29:38.695633	Pas de longue distance
4dfc0cae-8b2b-40ff-9025-3612fee42b75	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-21	13:00:00	19:00:00	2026-04-22 22:29:38.700262	2026-04-22 22:29:38.700262	Pas de longue distance
789e373c-335b-4035-9998-1f5d23812e20	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-22	12:00:00	18:00:00	2026-04-22 22:29:38.704582	2026-04-22 22:29:38.704582	\N
a7eacb69-e724-4e50-a365-25f739cdddee	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-23	13:00:00	20:00:00	2026-04-22 22:29:38.709165	2026-04-22 22:29:38.709165	\N
a470dc77-c704-4db1-aedc-2f922c923af4	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-24	13:00:00	20:00:00	2026-04-22 22:29:38.713119	2026-04-22 22:29:38.713119	\N
af5c89cc-ef58-4bb6-a1a3-7343899ac1ad	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-25	09:00:00	11:00:00	2026-04-22 22:29:38.717837	2026-04-22 22:29:38.717837	\N
b4b6ef4b-f74a-494e-aeb8-ac558232d395	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-25	16:00:00	19:00:00	2026-04-22 22:29:38.722146	2026-04-22 22:29:38.722146	\N
990d40b6-72b9-42ea-8123-62744180fedc	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-27	07:00:00	16:00:00	2026-04-22 22:29:38.72595	2026-04-22 22:29:38.72595	\N
3f64da9b-02e5-44c8-af15-fda874deed91	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-28	08:00:00	18:00:00	2026-04-22 22:29:38.730884	2026-04-22 22:29:38.730884	\N
9b934986-e5fa-455e-99eb-225246812df0	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-29	11:00:00	19:00:00	2026-04-22 22:29:38.734884	2026-04-22 22:29:38.734884	\N
da987deb-9d11-4f0f-972f-0ba0a0f5967b	ac57e90e-f690-4506-9246-12b2896daf12	2026-04-30	08:00:00	16:00:00	2026-04-22 22:29:38.739229	2026-04-22 22:29:38.739229	Disponible toute la journée
6997a1c5-ade1-479a-b581-af8e74efe51b	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-07	11:00:00	20:00:00	2026-04-22 22:29:38.743737	2026-04-22 22:29:38.743737	Disponible toute la journée
1b968a20-06a2-4188-a9a3-f681abc626d2	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-08	08:00:00	12:00:00	2026-04-22 22:29:38.748903	2026-04-22 22:29:38.748903	Disponible toute la journée
92dca73d-39e1-48d1-84e6-fa3dc3770e18	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-09	10:00:00	17:00:00	2026-04-22 22:29:38.752884	2026-04-22 22:29:38.752884	Disponible seulement le matin
fb75d606-fab8-4890-9b32-912c61a27b26	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-10	13:00:00	21:00:00	2026-04-22 22:29:38.758709	2026-04-22 22:29:38.758709	\N
43a3d385-fe52-49d7-81f0-162c5673b32e	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-11	06:00:00	15:00:00	2026-04-22 22:29:38.763411	2026-04-22 22:29:38.763411	Préfère les trajets courts
af4aa2f6-d4db-4b3f-b519-f514164f7b16	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-13	09:00:00	16:00:00	2026-04-22 22:29:38.767746	2026-04-22 22:29:38.767746	Disponible seulement le matin
025dbada-6f7a-4ce6-8c16-f5fa6b9519a0	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-14	11:00:00	21:00:00	2026-04-22 22:29:38.771931	2026-04-22 22:29:38.771931	\N
e363c7cf-8b6d-46ff-8225-fc54b7b1a848	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-15	06:00:00	16:00:00	2026-04-22 22:29:38.775747	2026-04-22 22:29:38.775747	Disponible toute la journée
a49af9a2-f5e8-4a4b-80e3-3c919eada8d1	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-16	08:00:00	18:00:00	2026-04-22 22:29:38.780706	2026-04-22 22:29:38.780706	\N
a7dc2b3d-c579-46b6-b41b-5b4a627fe71b	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-17	10:00:00	14:00:00	2026-04-22 22:29:38.784961	2026-04-22 22:29:38.784961	Pas de longue distance
160da485-5a10-419c-86a7-4d7df37341c0	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-18	07:00:00	14:00:00	2026-04-22 22:29:38.789429	2026-04-22 22:29:38.789429	\N
03db1e3d-dab4-47b3-ac69-2405d599ca3d	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-20	12:00:00	22:00:00	2026-04-22 22:29:38.794528	2026-04-22 22:29:38.794528	\N
bb20c7ca-429e-4717-b9c7-23222ff04a3d	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-21	08:00:00	13:00:00	2026-04-22 22:29:38.798686	2026-04-22 22:29:38.798686	Zone Rive-Sud uniquement
8fb6186a-e53e-4458-b1c1-f0807b6067bc	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-21	15:00:00	20:00:00	2026-04-22 22:29:38.803283	2026-04-22 22:29:38.803283	Zone Rive-Sud uniquement
7f1f282c-b31e-40a9-a77e-9bb3219516c6	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-22	10:00:00	18:00:00	2026-04-22 22:29:38.807216	2026-04-22 22:29:38.807216	Disponible toute la journée
43173abc-120f-4c45-91e4-b231e0f2f5f3	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-23	08:00:00	13:00:00	2026-04-22 22:29:38.811569	2026-04-22 22:29:38.811569	\N
8b9fd220-b63a-436d-a0c1-5b8134727188	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-23	14:00:00	19:00:00	2026-04-22 22:29:38.81601	2026-04-22 22:29:38.81601	\N
b18c480a-26c4-46d7-80a3-7d68e7c18b57	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-24	07:00:00	16:00:00	2026-04-22 22:29:38.819922	2026-04-22 22:29:38.819922	\N
8b289c20-fd22-43dc-9b9a-c63f884b921a	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-25	09:00:00	14:00:00	2026-04-22 22:29:38.824637	2026-04-22 22:29:38.824637	\N
3e7cefff-2a03-41a8-b93c-2bc2d0a9b15a	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-26	08:00:00	12:00:00	2026-04-22 22:29:38.828645	2026-04-22 22:29:38.828645	\N
039f1795-c1b2-4b48-a989-3e52ddf04310	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-28	06:00:00	12:00:00	2026-04-22 22:29:38.832908	2026-04-22 22:29:38.832908	Préfère les trajets courts
fe9b9b77-e26b-4c64-a56a-efb857848fbe	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-28	15:00:00	21:00:00	2026-04-22 22:29:38.836939	2026-04-22 22:29:38.836939	Préfère les trajets courts
13a176e1-4c0f-4e7a-bc6d-6458a947a820	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-29	09:00:00	12:00:00	2026-04-22 22:29:38.841409	2026-04-22 22:29:38.841409	\N
1d1987de-0b2d-4789-873f-078b193443e1	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-29	16:00:00	18:00:00	2026-04-22 22:29:38.846653	2026-04-22 22:29:38.846653	\N
629b0712-4cae-437e-878b-aac3e4ca391c	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-04-30	07:00:00	13:00:00	2026-04-22 22:29:38.853319	2026-04-22 22:29:38.853319	Pas de longue distance
4af9188f-bd6d-426a-82f7-a8473fa754dc	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-07	07:00:00	11:00:00	2026-04-22 22:29:38.857524	2026-04-22 22:29:38.857524	Préfère les trajets courts
4a53c8d9-856c-4f76-b362-de72000f550a	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-08	06:00:00	15:00:00	2026-04-22 22:29:38.861527	2026-04-22 22:29:38.861527	\N
563c1586-d7d2-4533-a6e8-808d1b4de328	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-10	09:00:00	13:00:00	2026-04-22 22:29:38.865998	2026-04-22 22:29:38.865998	Préfère les trajets courts
12340edf-3565-4e95-a38d-cc648384dc72	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-13	09:00:00	17:00:00	2026-04-22 22:29:38.87172	2026-04-22 22:29:38.87172	\N
8b704366-ce15-4173-b8eb-9dbcb8cfb69f	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-14	10:00:00	17:00:00	2026-04-22 22:29:38.876042	2026-04-22 22:29:38.876042	\N
657fccc5-42fa-45fa-8ebb-2c7b3ccd5f74	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-15	06:00:00	11:00:00	2026-04-22 22:29:38.880451	2026-04-22 22:29:38.880451	\N
de9efe5a-1704-4cac-ba50-23d55d9ce4f5	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-16	07:00:00	17:00:00	2026-04-22 22:29:38.8847	2026-04-22 22:29:38.8847	\N
3d3d3c78-0b22-47d8-853c-ec6bfa4a9125	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-17	11:00:00	20:00:00	2026-04-22 22:29:38.888738	2026-04-22 22:29:38.888738	Disponible seulement le matin
1ef7f378-922a-455b-94a7-e4f129da7f7c	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-21	09:00:00	15:00:00	2026-04-22 22:29:38.89266	2026-04-22 22:29:38.89266	\N
313fae51-2638-42c3-a6d5-fec93f7212b4	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-22	07:00:00	13:00:00	2026-04-22 22:29:38.897438	2026-04-22 22:29:38.897438	\N
8b608726-7866-4454-aaad-785dd140ea15	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-23	07:00:00	17:00:00	2026-04-22 22:29:38.903488	2026-04-22 22:29:38.903488	\N
a5251b08-ff14-434e-8629-7b89588b0196	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-24	12:00:00	19:00:00	2026-04-22 22:29:38.908686	2026-04-22 22:29:38.908686	\N
6cb39e57-527a-4f55-926a-67f5b0bb7aea	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-26	07:00:00	12:00:00	2026-04-22 22:29:38.914256	2026-04-22 22:29:38.914256	\N
e6108c81-90c2-43d1-8856-0a3d5f8c1d2d	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-26	15:00:00	17:00:00	2026-04-22 22:29:38.918384	2026-04-22 22:29:38.918384	\N
4cb6e6f0-1d6f-4227-b4c9-4a536969ddc6	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-27	11:00:00	16:00:00	2026-04-22 22:29:38.92491	2026-04-22 22:29:38.92491	Pas de longue distance
640bd1df-345b-4625-86a3-f8d861d85ab4	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-28	09:00:00	13:00:00	2026-04-22 22:29:38.92938	2026-04-22 22:29:38.92938	Zone Rive-Sud uniquement
0b07cf3d-3c29-454a-b1cd-cab3ea7eb048	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-28	14:00:00	20:00:00	2026-04-22 22:29:38.933271	2026-04-22 22:29:38.933271	Zone Rive-Sud uniquement
da101a7d-c939-4798-b024-ebad57d7895a	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-04-30	08:00:00	15:00:00	2026-04-22 22:29:38.937435	2026-04-22 22:29:38.937435	\N
a0332360-dc7e-4bf9-a484-a0de944fb273	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-06-27	05:30:00	14:00:00	2026-06-27 03:22:49.188481	2026-06-27 03:22:49.188481	\N
aea555b4-5cce-4897-bfe4-cebf89c54038	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-06-27	11:15:00	15:00:00	2026-06-27 03:25:59.015766	2026-06-27 03:25:59.015766	\N
f340c1fa-d3aa-4faf-a73e-3805274243ba	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-06-27	06:00:00	17:00:00	2026-06-27 03:25:59.305444	2026-06-27 03:25:59.305444	\N
0cd499f8-01bf-4073-879e-283d8ffce7fd	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-06-28	19:15:00	23:00:00	2026-06-27 03:25:59.591961	2026-06-27 03:25:59.591961	\N
71bb1ac8-74b7-441b-8fe7-b6d0268c08ca	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-06-28	05:45:00	10:00:00	2026-06-27 03:25:59.883777	2026-06-27 03:25:59.883777	\N
c2e0ca76-eaed-4d80-b554-f0222ed7cddd	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-06-29	06:15:00	09:00:00	2026-06-27 03:26:00.18043	2026-06-27 03:26:00.18043	\N
52ef3fed-936d-4af1-8f81-2bdd06e9fc9f	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-06-29	19:00:00	23:00:00	2026-06-27 03:26:00.469846	2026-06-27 03:26:00.469846	\N
4dae8466-f0cd-45f0-9fc6-39fefe1494ba	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-06-29	16:45:00	22:00:00	2026-06-27 03:26:00.765494	2026-06-27 03:26:00.765494	\N
65b9baac-ad83-4282-8a2c-b8fe2f8f161e	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-06-30	19:15:00	23:00:00	2026-06-27 03:26:01.067985	2026-06-27 03:26:01.067985	\N
c28a0c49-8e18-4500-be1b-dd19f89e6d3c	ac57e90e-f690-4506-9246-12b2896daf12	2026-06-30	17:00:00	23:30:00	2026-06-27 03:26:01.406604	2026-06-27 03:26:01.406604	\N
8a9b03da-7246-4a77-a264-a737dd879c87	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-01	14:15:00	19:00:00	2026-06-27 03:26:01.740185	2026-06-27 03:26:01.740185	\N
0ee38361-5bc0-4759-8db3-bd8e57773f47	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-01	18:00:00	22:00:00	2026-06-27 03:26:02.03704	2026-06-27 03:26:02.03704	\N
08498d92-d1f5-42e5-86ba-461555a3ccd5	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-01	06:00:00	10:00:00	2026-06-27 03:26:02.356401	2026-06-27 03:26:02.356401	\N
10b887d9-b835-49f6-9a2b-c08e94c94e63	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-02	06:00:00	17:00:00	2026-06-27 03:26:02.650407	2026-06-27 03:26:02.650407	\N
438f1b95-76cd-4cf9-aec3-e602b13f807f	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-02	10:00:00	14:00:00	2026-06-27 03:26:02.940586	2026-06-27 03:26:02.940586	\N
4fce51ee-1d7d-460c-8869-edcebe8237e5	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-02	05:45:00	10:00:00	2026-06-27 03:26:03.237148	2026-06-27 03:26:03.237148	\N
6ce9ed7e-106e-4a30-a770-6b579817d1d3	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-03	06:00:00	17:00:00	2026-06-27 03:26:03.519933	2026-06-27 03:26:03.519933	\N
d2eecc7b-b47a-4c29-afc0-087f1ac36a41	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-03	18:45:00	23:00:00	2026-06-27 03:26:03.803064	2026-06-27 03:26:03.803064	\N
ff5707f2-8a9a-47aa-b30f-745b16ac2392	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-04	19:00:00	23:00:00	2026-06-27 03:26:04.093744	2026-06-27 03:26:04.093744	\N
1d244f2e-c1e1-4dd9-987e-f0b9dd57dab2	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-04	06:00:00	17:00:00	2026-06-27 03:26:04.379356	2026-06-27 03:26:04.379356	\N
94d845cd-de1b-45c4-ad42-493dbdaad0b7	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-05	19:00:00	23:00:00	2026-06-27 03:26:04.668622	2026-06-27 03:26:04.668622	\N
952ef2aa-d5f9-417e-9be5-2515f0053cbc	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-05	17:00:00	22:00:00	2026-06-27 03:26:04.954729	2026-06-27 03:26:04.954729	\N
90a3d027-05f5-4dd1-9195-9796679cdfe5	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-06	19:00:00	23:00:00	2026-06-27 03:26:05.240151	2026-06-27 03:26:05.240151	\N
9772a1f4-bd39-4437-84fa-daf9fb2e50e3	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-06	06:15:00	10:00:00	2026-06-27 03:26:05.526395	2026-06-27 03:26:05.526395	\N
02653080-08a8-4995-8b4c-e907a890c5ff	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-07	10:00:00	14:00:00	2026-06-27 03:26:05.808663	2026-06-27 03:26:05.808663	\N
538791b9-6f32-4a9b-bc25-6a337b35c160	ac57e90e-f690-4506-9246-12b2896daf12	2026-07-07	17:00:00	23:30:00	2026-06-27 03:26:06.098948	2026-06-27 03:26:06.098948	\N
56b5b4ce-a6ac-48aa-b476-8e04908069b2	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-18	10:15:00	14:00:00	2026-06-27 03:26:13.920011	2026-06-27 03:26:13.920011	\N
d542a401-69d6-48df-afc3-feab827d002d	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-18	18:45:00	23:00:00	2026-06-27 03:26:13.99028	2026-06-27 03:26:13.99028	\N
b0602c97-a1d6-49d3-9278-f713c9daca3c	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-18	10:00:00	14:00:00	2026-06-27 03:26:14.062456	2026-06-27 03:26:14.062456	\N
1a2672ec-395f-4435-85f2-86e3b6473fcc	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-18	19:00:00	23:00:00	2026-06-27 03:26:14.136047	2026-06-27 03:26:14.136047	\N
f84977e6-0636-42eb-a95c-8eadb20fa4eb	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-18	10:15:00	14:00:00	2026-06-27 03:26:14.207356	2026-06-27 03:26:14.207356	\N
f5c307ab-7e44-43b0-b696-edadb7bceafd	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-18	19:00:00	23:00:00	2026-06-27 03:26:14.278425	2026-06-27 03:26:14.278425	\N
d41e1c76-1a40-42a5-994f-1eee248dc835	ac57e90e-f690-4506-9246-12b2896daf12	2026-07-18	16:45:00	23:30:00	2026-06-27 03:26:14.348727	2026-06-27 03:26:14.348727	\N
829860c4-4c85-4d05-ae1c-125ea67a240f	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-18	06:15:00	17:00:00	2026-06-27 03:26:14.421035	2026-06-27 03:26:14.421035	\N
ae553b73-fbe0-4d48-8fdb-a9584997f71c	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-18	06:00:00	10:00:00	2026-06-27 03:26:14.495444	2026-06-27 03:26:14.495444	\N
6ad600f4-46da-4f2a-bf39-498e114c072a	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-18	17:00:00	22:00:00	2026-06-27 03:26:14.565334	2026-06-27 03:26:14.565334	\N
f6a60318-6a29-49d9-a73f-3df983bdac03	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-19	10:00:00	14:00:00	2026-06-27 03:26:14.635985	2026-06-27 03:26:14.635985	\N
03dd2bca-3f02-4734-a64e-ad9d3b3e0b76	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-19	19:00:00	23:00:00	2026-06-27 03:26:14.707449	2026-06-27 03:26:14.707449	\N
aae87278-4657-41bf-a7dd-77b9e93fec4f	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-19	10:00:00	14:00:00	2026-06-27 03:26:14.777928	2026-06-27 03:26:14.777928	\N
e25d8660-305b-43d3-9db7-9b79f9f4f390	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-19	18:45:00	23:00:00	2026-06-27 03:26:14.853759	2026-06-27 03:26:14.853759	\N
3361f368-4ee4-409d-b803-7f530ad388c3	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-19	05:45:00	17:00:00	2026-06-27 03:26:14.925817	2026-06-27 03:26:14.925817	\N
80402036-0229-4f96-931b-80ed2a3d31ca	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-19	05:45:00	10:00:00	2026-06-27 03:26:14.995856	2026-06-27 03:26:14.995856	\N
0461709a-1084-4b63-85df-bccdf9aefcda	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-19	16:45:00	22:00:00	2026-06-27 03:26:15.072677	2026-06-27 03:26:15.072677	\N
39a84619-d1ff-4bb1-ad0e-5d186aa014fc	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-20	06:45:00	11:30:00	2026-06-27 03:26:15.144181	2026-06-27 03:26:15.144181	\N
121b34cd-6768-4c87-983e-b6b982e3e08e	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-20	14:00:00	19:00:00	2026-06-27 03:26:15.214846	2026-06-27 03:26:15.214846	\N
0dc276b9-ae47-4ba0-9bd4-12db5f0299e8	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-20	09:45:00	14:00:00	2026-06-27 03:26:15.286533	2026-06-27 03:26:15.286533	\N
d29dd5bc-f5d3-40d2-ad59-67eaaaa5d1bf	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-20	19:00:00	23:00:00	2026-06-27 03:26:15.357532	2026-06-27 03:26:15.357532	\N
a2ca9f19-f92c-4d02-9b53-d77b8ed7fa92	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-20	10:00:00	14:00:00	2026-06-27 03:26:15.427995	2026-06-27 03:26:15.427995	\N
a593ea77-1f6a-413d-b0f1-f89cf478d896	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-20	18:45:00	23:00:00	2026-06-27 03:26:15.498869	2026-06-27 03:26:15.498869	\N
e99300ac-a1cb-42b5-940e-e6b6ff8e5363	ac57e90e-f690-4506-9246-12b2896daf12	2026-07-20	17:15:00	23:30:00	2026-06-27 03:26:15.568419	2026-06-27 03:26:15.568419	\N
8424407c-7517-45a1-af71-cb1a17b7d19f	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-20	06:15:00	17:00:00	2026-06-27 03:26:15.639216	2026-06-27 03:26:15.639216	\N
e37c2b3b-0bdc-45fe-9550-562602b71b8c	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-20	06:00:00	10:00:00	2026-06-27 03:26:15.709121	2026-06-27 03:26:15.709121	\N
3e7097ba-0075-41ba-a1e2-273da7baac60	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-20	17:00:00	22:00:00	2026-06-27 03:26:15.779745	2026-06-27 03:26:15.779745	\N
3a2e0cce-6ea8-4684-9aab-056151b9906e	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-21	07:00:00	11:30:00	2026-06-27 03:26:15.853523	2026-06-27 03:26:15.853523	\N
1d25e024-c8b8-4045-a6f1-117c33d944b8	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-21	13:45:00	19:00:00	2026-06-27 03:26:15.92378	2026-06-27 03:26:15.92378	\N
5953043e-7396-4492-9bcb-3e79013884c2	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-21	10:00:00	14:00:00	2026-06-27 03:26:15.993311	2026-06-27 03:26:15.993311	\N
ace4127c-8252-4bef-9970-4327d4b0537b	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-21	19:00:00	23:00:00	2026-06-27 03:26:16.064106	2026-06-27 03:26:16.064106	\N
96c60578-808f-46ca-b85b-d9cef15599cf	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-21	05:45:00	09:00:00	2026-06-27 03:26:16.139684	2026-06-27 03:26:16.139684	\N
8eb1d997-379b-4e28-a990-afb46bdcde3b	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-21	11:00:00	15:00:00	2026-06-27 03:26:16.210606	2026-06-27 03:26:16.210606	\N
b754c221-19d3-406d-b12b-40456b2819e6	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-21	17:45:00	22:00:00	2026-06-27 03:26:16.281367	2026-06-27 03:26:16.281367	\N
1f3740fa-fb4b-4ca9-ace0-17fe9bdac929	ac57e90e-f690-4506-9246-12b2896daf12	2026-07-21	17:15:00	23:30:00	2026-06-27 03:26:16.352986	2026-06-27 03:26:16.352986	\N
c07abbd5-d7e1-4c4a-be60-682f4551028b	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-21	05:45:00	10:00:00	2026-06-27 03:26:16.424447	2026-06-27 03:26:16.424447	\N
9d53e520-cea9-49b4-90b6-f003a43818d8	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-21	17:15:00	22:00:00	2026-06-27 03:26:16.495511	2026-06-27 03:26:16.495511	\N
c47223f9-5ff8-42fd-a4aa-ea5b3407df26	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-22	07:15:00	11:30:00	2026-06-27 03:26:16.566667	2026-06-27 03:26:16.566667	\N
8a4e6707-cf00-4841-9e2b-efdcd83005bf	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-22	14:15:00	19:00:00	2026-06-27 03:26:16.638445	2026-06-27 03:26:16.638445	\N
0be6548d-7a41-4657-a04d-404415511233	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-22	06:15:00	17:00:00	2026-06-27 03:26:16.709511	2026-06-27 03:26:16.709511	\N
9d327cdd-7f75-47e3-9f8f-700485c1fb81	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-22	10:15:00	14:00:00	2026-06-27 03:26:16.781364	2026-06-27 03:26:16.781364	\N
4210d86c-8733-4bbb-9377-c905701c7520	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-22	19:00:00	23:00:00	2026-06-27 03:26:16.854916	2026-06-27 03:26:16.854916	\N
c7f0a8d7-50d2-4c6d-bc96-f5e71b61e5b1	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-22	13:15:00	21:00:00	2026-06-27 03:26:16.926266	2026-06-27 03:26:16.926266	\N
2b46d716-eb37-48f9-9512-d72e0fc22d05	ac57e90e-f690-4506-9246-12b2896daf12	2026-07-22	17:00:00	23:30:00	2026-06-27 03:26:16.997519	2026-06-27 03:26:16.997519	\N
6f410874-274d-456e-8dc9-ee4d5ce8942b	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-22	06:00:00	10:00:00	2026-06-27 03:26:17.068949	2026-06-27 03:26:17.068949	\N
4c933e99-e892-45b2-9afa-c93b59f4ad19	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-22	17:15:00	22:00:00	2026-06-27 03:26:17.152203	2026-06-27 03:26:17.152203	\N
68b9b57d-f0d7-4a1e-91c9-1f5e656f60de	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-23	06:45:00	11:30:00	2026-06-27 03:26:17.265323	2026-06-27 03:26:17.265323	\N
2e260531-f31a-4dff-8c93-39c9eaab224d	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-23	14:00:00	19:00:00	2026-06-27 03:26:17.341592	2026-06-27 03:26:17.341592	\N
175880be-fc4f-40e8-b82f-fe7095e4f9d8	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-23	06:00:00	17:00:00	2026-06-27 03:26:17.437227	2026-06-27 03:26:17.437227	\N
1a27c7ae-5c5b-4c8b-964b-d53c3eb73399	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-23	10:00:00	14:00:00	2026-06-27 03:26:17.507521	2026-06-27 03:26:17.507521	\N
135daa0d-f924-4a99-87c0-2de71e7cf744	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-23	19:00:00	23:00:00	2026-06-27 03:26:17.579296	2026-06-27 03:26:17.579296	\N
a36543f9-bae1-48f7-8184-d534d2f6711b	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-23	09:45:00	14:00:00	2026-06-27 03:26:17.649775	2026-06-27 03:26:17.649775	\N
8ee51219-81e4-4fc2-9854-7ce181e557e2	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-23	18:45:00	23:00:00	2026-06-27 03:26:17.720664	2026-06-27 03:26:17.720664	\N
c45779a4-ce13-4aca-a67d-fcbb1cf66268	ac57e90e-f690-4506-9246-12b2896daf12	2026-07-23	17:00:00	23:30:00	2026-06-27 03:26:17.791707	2026-06-27 03:26:17.791707	\N
26cbb624-7be1-4c1b-981a-cc4409864930	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-23	06:00:00	17:00:00	2026-06-27 03:26:17.864062	2026-06-27 03:26:17.864062	\N
cd02089f-6a6b-478a-8d2f-9b8d5baa622b	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-23	05:45:00	10:00:00	2026-06-27 03:26:17.934723	2026-06-27 03:26:17.934723	\N
fac355fb-b41b-4e0f-983a-83afef7bd5fc	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-23	17:00:00	22:00:00	2026-06-27 03:26:18.008261	2026-06-27 03:26:18.008261	\N
b038e966-de7c-4028-b26e-9adcdeb7e939	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-24	07:15:00	11:30:00	2026-06-27 03:26:18.080606	2026-06-27 03:26:18.080606	\N
5bc972ea-f2c9-4457-9884-ef1f91cc70a2	f8aa0514-4755-40d8-95b7-41eb5df66a2d	2026-07-24	14:15:00	19:00:00	2026-06-27 03:26:18.152153	2026-06-27 03:26:18.152153	\N
f5544b43-e42f-4a13-b000-aa869e8d4b5e	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-24	10:00:00	14:00:00	2026-06-27 03:26:18.223685	2026-06-27 03:26:18.223685	\N
2938f69e-d976-48f0-b973-056b6351488d	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-24	19:00:00	23:00:00	2026-06-27 03:26:18.294413	2026-06-27 03:26:18.294413	\N
cb5605f7-22b5-495b-bd4e-32a8de796fdc	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-24	06:00:00	09:00:00	2026-06-27 03:26:18.364682	2026-06-27 03:26:18.364682	\N
2fd1e008-026f-4a9b-8995-e6088ee4f8c0	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-24	11:15:00	15:00:00	2026-06-27 03:26:18.43543	2026-06-27 03:26:18.43543	\N
7b461a9e-bbfe-49ab-9eec-d2a5e3024199	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-24	17:45:00	22:00:00	2026-06-27 03:26:18.506213	2026-06-27 03:26:18.506213	\N
f02de356-9ba3-4115-920d-5569aae96d66	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-24	10:00:00	14:00:00	2026-06-27 03:26:18.576727	2026-06-27 03:26:18.576727	\N
8df3df83-cc19-48e5-8e3f-ab27ba2034e7	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-24	19:00:00	23:00:00	2026-06-27 03:26:18.647458	2026-06-27 03:26:18.647458	\N
d05af66d-2366-46af-b915-fc63bfeba760	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-24	06:00:00	17:00:00	2026-06-27 03:26:18.718641	2026-06-27 03:26:18.718641	\N
5887cee2-19c8-479e-a25c-ff8b34bb870d	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-25	05:45:00	17:00:00	2026-06-27 03:26:18.790015	2026-06-27 03:26:18.790015	\N
1a7c469d-2911-4111-8e56-28c1a8f96d4d	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-25	05:45:00	09:00:00	2026-06-27 03:26:18.863382	2026-06-27 03:26:18.863382	\N
48b79b67-a67e-48cf-8701-d2d658b2cf6a	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-25	11:00:00	15:00:00	2026-06-27 03:26:18.933967	2026-06-27 03:26:18.933967	\N
d04897ab-6461-4dc5-bb58-6692be8fb536	fd4bc826-7b37-476f-be0f-a00dc64fc4ae	2026-07-25	18:00:00	22:00:00	2026-06-27 03:26:19.005283	2026-06-27 03:26:19.005283	\N
a78d058f-8a6e-4425-8f3b-38cb186d2904	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-25	10:15:00	14:00:00	2026-06-27 03:26:19.077707	2026-06-27 03:26:19.077707	\N
de572f5f-d2ee-4fca-842b-c48805d3799b	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-25	19:00:00	23:00:00	2026-06-27 03:26:19.14974	2026-06-27 03:26:19.14974	\N
9ecc4d35-b2ca-4900-ba10-f944e78b1139	ac57e90e-f690-4506-9246-12b2896daf12	2026-07-25	17:15:00	23:30:00	2026-06-27 03:26:19.22173	2026-06-27 03:26:19.22173	\N
e3e8e764-460f-4808-87ac-51d45db2ae56	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-25	06:00:00	17:00:00	2026-06-27 03:26:19.292047	2026-06-27 03:26:19.292047	\N
fb67ea3c-17b1-4ff8-b9a1-c01b110801fb	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-25	05:45:00	10:00:00	2026-06-27 03:26:19.361703	2026-06-27 03:26:19.361703	\N
797cfc62-9e0b-445f-a294-5715a43880ef	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-25	16:45:00	22:00:00	2026-06-27 03:26:19.43224	2026-06-27 03:26:19.43224	\N
020affcf-99d2-4bbc-a1ac-a76cc56a60ec	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-07-26	05:45:00	17:00:00	2026-06-27 03:26:19.51454	2026-06-27 03:26:19.51454	\N
cd812231-4bcd-48cd-b831-fa9ada2220f3	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-07-26	13:00:00	21:00:00	2026-06-27 03:26:19.591357	2026-06-27 03:26:19.591357	\N
d9373423-8e3e-4fe2-8269-813a049f7be3	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-07-26	06:15:00	17:00:00	2026-06-27 03:26:19.662323	2026-06-27 03:26:19.662323	\N
703f22dc-1f1c-45ae-8541-6a4a14446b51	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-26	06:00:00	10:00:00	2026-06-27 03:26:19.732942	2026-06-27 03:26:19.732942	\N
28da7155-5432-4b2e-962f-a9bce26c84cc	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-07-26	17:00:00	22:00:00	2026-06-27 03:26:19.805442	2026-06-27 03:26:19.805442	\N
\.


--
-- Data for Name: envois_email; Type: TABLE DATA; Schema: public; Owner: dispatch_user
--

COPY public.envois_email (id, chauffeur_id, date_programme, envoye_par, envoye_le, nb_trajets, statut_envoi, erreur) FROM stdin;
a8cb19f1-7006-42e5-a8ed-01477eaac06a	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-06-29	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-06-26 20:02:14.464527	4	envoye	\N
f574583a-d268-4c15-9581-a8221a18df03	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-06-29	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-06-26 20:02:18.450747	5	envoye	\N
97cb48bb-41be-4cca-9894-d067b2f7de23	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-06-29	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-06-26 20:02:22.36766	1	envoye	\N
e250b1d5-7682-4a3e-93a0-e30bcddd2869	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-06-29	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-06-26 20:02:25.653858	1	envoye	\N
25b55eb2-e55d-45eb-be25-8eb99de344c6	2fb8af64-bf43-46d3-9053-5fd673a68c2a	2026-06-29	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-06-26 22:37:00.286702	1	envoye	\N
a1a41d4c-d636-41a0-83cd-f12eea3ab69a	5df0dd59-c2f6-4075-8d43-c82892209c90	2026-06-29	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-06-26 22:37:03.033456	2	envoye	\N
0e6a4940-3b77-404f-b9f1-95ca3fa25185	88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	2026-06-29	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-06-26 22:37:05.748841	1	envoye	\N
367726ab-2c28-4ffe-b9f4-f4712a2e1318	e2f8c134-2778-45ed-803d-ab40d7db761b	2026-06-29	6c4efa13-53d2-47fb-a8b2-f1c504c31156	2026-06-26 22:37:07.959648	2	envoye	\N
\.


--
-- Data for Name: gps_logs; Type: TABLE DATA; Schema: public; Owner: dispatch_user
--

COPY public.gps_logs (id, chauffeur_id, route_id, stop_id, latitude, longitude, vitesse_kmh, precision_m, timestamp_device, received_at, event_type) FROM stdin;
\.


--
-- Data for Name: routes; Type: TABLE DATA; Schema: public; Owner: dispatch_user
--

COPY public.routes (id, chauffeur_id, nom, date_planifiee, statut, heure_debut_reelle, heure_fin_reelle, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stops; Type: TABLE DATA; Schema: public; Owner: dispatch_user
--

COPY public.stops (id, route_id, ordre, adresse, latitude, longitude, rayon_geofence_m, notes, statut, heure_arrivee_prevue, heure_arrivee_reelle, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: trajets; Type: TABLE DATA; Schema: public; Owner: dispatch_user
--

COPY public.trajets (id, code_trajet, date_trajet, heure_prise, heure_arrivee, type_vehicule, adresse_prise, lat_prise, lng_prise, adresse_arrivee, lat_arrivee, lng_arrivee, code_fixe, statut, notes, cree_le, modifie_le) FROM stdin;
dd5e1790-5d29-4a99-a70e-afdcfba50fc8	T2026040701	2026-04-07	06:17:00	07:38:00	TAXI	3400 de Maisonneuve O Montreal H3Z 3B8	\N	\N	Centre Hospitalier Pierre-Boucher, 1333 Montarville Longueuil J4M 2A5	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.470245	2026-04-22 22:29:37.470245
36cd8eb1-6fc7-4752-a6ee-247ac1294d53	T2026040702	2026-04-07	08:04:00	08:38:00	TAXI	2505 Rue Ontario E Montreal H2K 1X3	\N	\N	Hopital Jean-Talon, 1385 Rue Jean-Talon E Montreal H2E 1S6	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.477208	2026-04-22 22:29:37.477208
e4d5bda7-3137-4afb-8962-43258a02359c	T2026040703	2026-04-07	08:49:00	10:06:00	TAXI	2100 Boulevard Lapiniere Brossard J4W 2T5	\N	\N	Hopital Santa Cabrini, 5655 Rue Saint-Zotique E Montreal H1T 1P7	\N	\N	\N	en_attente	Patient fragile — conduite prudente	2026-04-22 22:29:37.483765	2026-04-22 22:29:37.483765
2cc0a578-881f-405a-8057-888d2e39c6da	T2026040704	2026-04-07	10:26:00	11:47:00	BERLINE	227 du Golf RUE Mont-Saint-Hilaire J3H 5Z8	\N	\N	Hopital Charles-Le Moyne, 3120 Boul. Taschereau Greenfield Park J4V 2H1	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.489798	2026-04-22 22:29:37.489798
2b39e53f-3197-4e65-9088-0d17c0a0f6a6	T2026040801	2026-04-08	06:40:00	07:46:00	TAXI	2000 Chemin du Tremblay Boucherville J4B 6Y1	\N	\N	Hopital Charles-Le Moyne, 3120 Boul. Taschereau Greenfield Park J4V 2H1	\N	\N	\N	en_attente	Accompagnateur présent	2026-04-22 22:29:37.495215	2026-04-22 22:29:37.495215
96fc2e9b-3a8f-4276-9340-8b7c2350f78e	T2026040802	2026-04-08	08:16:00	08:50:00	TAXI	450 Rue Sherbrooke E Montreal H2L 1J7	\N	\N	Hopital Anna-Laberge, 200 Boul. Brisebois Chateauguay J6K 4W8	\N	\N	\N	en_attente	Appeler à l'arrivée	2026-04-22 22:29:37.499915	2026-04-22 22:29:37.499915
ee5e8577-60be-4e32-b42b-0c33b0449837	T2026040803	2026-04-08	09:19:00	10:47:00	TAXI	150 Rue du Boisé Varennes J3X 1N4	\N	\N	Hopital du Sacre-Coeur, 5400 Gouin O Montreal H4J 1C5	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.504925	2026-04-22 22:29:37.504925
705ff0ca-2222-449d-87e5-c2601965d450	T2026040804	2026-04-08	11:06:00	12:33:00	BERLINE	61 De Montbrun RUE Boucherville J4B 5T3	\N	\N	Institut de Readaptation Gingras-Lindsay, 6300 Darlington Montreal H3S 2J4	\N	\N	\N	en_attente	Appeler à l'arrivée	2026-04-22 22:29:37.509793	2026-04-22 22:29:37.509793
096d978d-1633-4a08-95be-55213bef4010	T2026040805	2026-04-08	12:49:00	13:29:00	TAXI	1730 Eiffel RUE Boucherville J4B 7W1	\N	\N	CUSM - Glen, 1001 Decarie Montreal H4A 3J1	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.514542	2026-04-22 22:29:37.514542
0c6eb70e-b517-4f59-be11-887781036d50	T2026040901	2026-04-09	06:21:00	07:53:00	BERLINE	3400 de Maisonneuve O Montreal H3Z 3B8	\N	\N	CUSM - Glen, 1001 Decarie Montreal H4A 3J1	\N	\N	\N	en_attente	Accompagnateur présent	2026-04-22 22:29:37.519332	2026-04-22 22:29:37.519332
d8fc3b7e-52e9-457b-991e-c5a5263dc380	T2026040902	2026-04-09	08:33:00	09:42:00	TAXI	5515 Saint-Jacques Montreal H4A 3A2	\N	\N	Clinique Medicale Sainte-Julie, 585 Rue Saint-Louis Sainte-Julie J3E 2A8	\N	\N	\N	en_attente	Accompagnateur présent	2026-04-22 22:29:37.524149	2026-04-22 22:29:37.524149
950b758e-5896-41d7-8efe-b01c5f770bb0	T2026040903	2026-04-09	10:17:00	11:24:00	TAXI	1000 Saint-Denis RUE Montreal H2X 0C1	\N	\N	CHUM, 1000 Rue Saint-Denis, Montreal H2X 0C1	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.528576	2026-04-22 22:29:37.528576
85b4eaf5-abd7-4777-b168-9f38beed4f5c	T2026040904	2026-04-09	12:04:00	12:47:00	TAXI	450 Rue Sherbrooke E Montreal H2L 1J7	\N	\N	Hopital Maisonneuve-Rosemont, 5415 Boul. Assomption Montreal H1T 2M4	\N	\N	\N	en_attente	Patient fragile — conduite prudente	2026-04-22 22:29:37.534239	2026-04-22 22:29:37.534239
85ba7253-3afa-4ef9-bc56-c4138757584c	T2026041001	2026-04-10	06:27:00	07:39:00	BERLINE	2100 Boulevard Lapiniere Brossard J4W 2T5	\N	\N	Polyclinique de Longueuil, 800 Ch. Tiffin Longueuil J4P 3J7	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.538937	2026-04-22 22:29:37.538937
a128a378-212c-4e0a-a037-271f8f1f7758	T2026041002	2026-04-10	07:53:00	09:21:00	TAXI	2100 Boulevard Lapiniere Brossard J4W 2T5	\N	\N	CLSC Longueuil-Est, 1905 Rue Alexandre-de-Sève Longueuil J4K 2P8	\N	\N	\N	en_attente	Accompagnateur présent	2026-04-22 22:29:37.543424	2026-04-22 22:29:37.543424
869a0ef9-f61a-4ece-82ed-e1610194efa4	T2026041003	2026-04-10	09:55:00	10:57:00	TAXI	450 Rue Sherbrooke E Montreal H2L 1J7	\N	\N	Hopital de Verdun, 4000 Boul. Lasalle Verdun H4G 2A3	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.548147	2026-04-22 22:29:37.548147
84377e37-bbf4-4495-8356-0f1f75ba6be0	T2026041004	2026-04-10	11:13:00	12:14:00	TAXI	150 Rue du Boisé Varennes J3X 1N4	\N	\N	Hopital du Sacre-Coeur, 5400 Gouin O Montreal H4J 1C5	\N	\N	\N	en_attente	Patient fragile — conduite prudente	2026-04-22 22:29:37.553771	2026-04-22 22:29:37.553771
bd8eed56-5c23-4842-b7f3-1d373f830fd7	T2026041005	2026-04-10	12:27:00	12:57:00	TAXI	61 De Montbrun RUE Boucherville J4B 5T3	\N	\N	Hopital de Verdun, 4000 Boul. Lasalle Verdun H4G 2A3	\N	\N	\N	en_attente	Appeler à l'arrivée	2026-04-22 22:29:37.559032	2026-04-22 22:29:37.559032
686344cc-7525-4b60-a7b3-825a30402528	T2026041006	2026-04-10	13:17:00	13:54:00	TAXI	5515 Saint-Jacques Montreal H4A 3A2	\N	\N	Hopital du Sacre-Coeur, 5400 Gouin O Montreal H4J 1C5	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.564533	2026-04-22 22:29:37.564533
565cc4dc-bf5a-4a49-ac94-f9d7edafe92c	T2026041101	2026-04-11	06:36:00	07:45:00	TAXI	1700 Boulevard Taschereau Longueuil J4G 1A4	\N	\N	Hopital Maisonneuve-Rosemont, 5415 Boul. Assomption Montreal H1T 2M4	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.570183	2026-04-22 22:29:37.570183
04477371-a5bb-43cb-91e7-3858119a432c	T2026041102	2026-04-11	08:15:00	08:45:00	TAXI	150 Rue du Boisé Varennes J3X 1N4	\N	\N	Hopital Anna-Laberge, 200 Boul. Brisebois Chateauguay J6K 4W8	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.574516	2026-04-22 22:29:37.574516
cca74b9a-3d0e-47a2-a6cb-0b2c6900d1fc	T2026041103	2026-04-11	09:08:00	09:51:00	BERLINE	2505 Rue Ontario E Montreal H2K 1X3	\N	\N	Clinique Rive-Sud, 5320 Cousineau Brossard J4Y 2X2	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.579278	2026-04-22 22:29:37.579278
1ad85ee9-c59b-44a1-a779-d33a3aa20038	T2026041104	2026-04-11	10:05:00	11:18:00	BERLINE	1730 Eiffel RUE Boucherville J4B 7W1	\N	\N	Hopital Charles-Le Moyne, 3120 Boul. Taschereau Greenfield Park J4V 2H1	\N	\N	\N	en_attente	Accès fauteuil roulant	2026-04-22 22:29:37.585342	2026-04-22 22:29:37.585342
9282a91f-253c-463b-a603-f048a76ca663	T2026041105	2026-04-11	11:50:00	12:38:00	TAXI	980 Rue Sagard Montreal H2C 2X1	\N	\N	CLSC Longueuil-Est, 1905 Rue Alexandre-de-Sève Longueuil J4K 2P8	\N	\N	\N	en_attente	Accès fauteuil roulant	2026-04-22 22:29:37.590614	2026-04-22 22:29:37.590614
c6c6bab9-b10e-4087-85d9-bf7baff051a9	T2026041201	2026-04-12	06:10:00	06:38:00	TAXI	61 De Montbrun RUE Boucherville J4B 5T3	\N	\N	Hopital Charles-Le Moyne, 3120 Boul. Taschereau Greenfield Park J4V 2H1	\N	\N	\N	en_attente	Patient fragile — conduite prudente	2026-04-22 22:29:37.594921	2026-04-22 22:29:37.594921
215c9da5-b89a-459b-8e48-dea16a408c51	T2026041202	2026-04-12	06:56:00	07:28:00	TAXI	980 Rue Sagard Montreal H2C 2X1	\N	\N	Hopital Maisonneuve-Rosemont, 5415 Boul. Assomption Montreal H1T 2M4	\N	\N	\N	en_attente	Patient fragile — conduite prudente	2026-04-22 22:29:37.600212	2026-04-22 22:29:37.600212
d3415a56-9dd9-4aa7-8071-6731dd763b6d	T2026041203	2026-04-12	07:49:00	08:48:00	TAXI	2000 Chemin du Tremblay Boucherville J4B 6Y1	\N	\N	Clinique Rive-Sud, 5320 Cousineau Brossard J4Y 2X2	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.60864	2026-04-22 22:29:37.60864
456667c8-4a06-4a41-9d1b-a9cd86929030	T2026041301	2026-04-13	06:27:00	08:02:00	BERLINE	2505 Rue Ontario E Montreal H2K 1X3	\N	\N	CLSC Longueuil-Est, 1905 Rue Alexandre-de-Sève Longueuil J4K 2P8	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.613334	2026-04-22 22:29:37.613334
2a6ddb1d-ee83-440c-8179-870ef396d256	T2026041302	2026-04-13	08:15:00	09:03:00	BERLINE	2505 Rue Ontario E Montreal H2K 1X3	\N	\N	Centre Hospitalier Pierre-Boucher, 1333 Montarville Longueuil J4M 2A5	\N	\N	\N	en_attente	Appeler à l'arrivée	2026-04-22 22:29:37.618357	2026-04-22 22:29:37.618357
7758b1ba-718c-4df5-bb68-d2b8d233248f	T2026041303	2026-04-13	09:32:00	10:04:00	TAXI	1730 Eiffel RUE Boucherville J4B 7W1	\N	\N	Hopital Santa Cabrini, 5655 Rue Saint-Zotique E Montreal H1T 1P7	\N	\N	\N	en_attente	Accompagnateur présent	2026-04-22 22:29:37.622832	2026-04-22 22:29:37.622832
c35d8cc3-22b5-495b-8b84-da361a2e264a	T2026041304	2026-04-13	10:34:00	11:48:00	TAXI	3355 Autoroute Laval H7T 0H4	\N	\N	Polyclinique de Longueuil, 800 Ch. Tiffin Longueuil J4P 3J7	\N	\N	\N	en_attente	Accompagnateur présent	2026-04-22 22:29:37.627079	2026-04-22 22:29:37.627079
486a875f-4fef-4d66-a6c8-fdaf62621cdf	T2026041305	2026-04-13	11:59:00	12:35:00	TAXI	3400 de Maisonneuve O Montreal H3Z 3B8	\N	\N	Clinique Medicale Sainte-Julie, 585 Rue Saint-Louis Sainte-Julie J3E 2A8	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.631413	2026-04-22 22:29:37.631413
eec449d5-8a0f-48e4-a0f4-ca48ea72fd8a	T2026041306	2026-04-13	13:15:00	14:10:00	TAXI	227 du Golf RUE Mont-Saint-Hilaire J3H 5Z8	\N	\N	Hopital Santa Cabrini, 5655 Rue Saint-Zotique E Montreal H1T 1P7	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.636009	2026-04-22 22:29:37.636009
b946098b-38ba-4cfb-878f-c4dfee91307c	T2026041401	2026-04-14	06:38:00	08:11:00	TAXI	555 Rue Roland-Therrien Longueuil J4H 3V7	\N	\N	Clinique Rive-Sud, 5320 Cousineau Brossard J4Y 2X2	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.64068	2026-04-22 22:29:37.64068
8948d68e-6d66-4664-9e6d-f01c6f40622e	T2026041402	2026-04-14	08:41:00	09:53:00	TAXI	1000 Saint-Denis RUE Montreal H2X 0C1	\N	\N	Centre Hospitalier Pierre-Boucher, 1333 Montarville Longueuil J4M 2A5	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.645213	2026-04-22 22:29:37.645213
2633eac5-f041-4b52-8858-6fe32f8caa13	T2026041403	2026-04-14	10:24:00	11:44:00	BERLINE	730 Abbe-Theoret AV Sainte-Julie J3E 0E1	\N	\N	Hopital Jean-Talon, 1385 Rue Jean-Talon E Montreal H2E 1S6	\N	\N	\N	en_attente	Appeler à l'arrivée	2026-04-22 22:29:37.649622	2026-04-22 22:29:37.649622
5ac53b32-7da4-4d60-ae05-6e0692523437	T2026041404	2026-04-14	11:57:00	12:33:00	TAXI	1000 Saint-Denis RUE Montreal H2X 0C1	\N	\N	Polyclinique de Longueuil, 800 Ch. Tiffin Longueuil J4P 3J7	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.654566	2026-04-22 22:29:37.654566
e5840f8d-8e3f-4d47-8308-602468b17832	T2026041501	2026-04-15	06:29:00	07:42:00	BERLINE	2000 Chemin du Tremblay Boucherville J4B 6Y1	\N	\N	Clinique Medicale Sainte-Julie, 585 Rue Saint-Louis Sainte-Julie J3E 2A8	\N	\N	\N	en_attente	Retour à confirmer	2026-04-22 22:29:37.663287	2026-04-22 22:29:37.663287
835c1b10-4547-4670-b192-c29917d76c96	T2026041502	2026-04-15	07:54:00	08:59:00	TAXI	2100 Boulevard Lapiniere Brossard J4W 2T5	\N	\N	Hopital Charles-Le Moyne, 3120 Boul. Taschereau Greenfield Park J4V 2H1	\N	\N	\N	en_attente	Patient fragile — conduite prudente	2026-04-22 22:29:37.668764	2026-04-22 22:29:37.668764
92c20df7-1a29-4603-b309-0df450bc2101	T2026041503	2026-04-15	09:39:00	11:12:00	TAXI	2100 Boulevard Lapiniere Brossard J4W 2T5	\N	\N	Clinique Medicale Sainte-Julie, 585 Rue Saint-Louis Sainte-Julie J3E 2A8	\N	\N	\N	en_attente	Accès fauteuil roulant	2026-04-22 22:29:37.673205	2026-04-22 22:29:37.673205
e8a09b50-a35f-407c-8258-629cdb0108fa	T2026041504	2026-04-15	11:51:00	12:44:00	TAXI	625 Lechasseur RUE Beloeil J3G 3N1	\N	\N	Polyclinique de Longueuil, 800 Ch. Tiffin Longueuil J4P 3J7	\N	\N	\N	en_attente	Retour à confirmer	2026-04-22 22:29:37.677791	2026-04-22 22:29:37.677791
f5dc2ce6-e648-4177-9a77-a003ab1b8afd	T2026041505	2026-04-15	12:59:00	13:57:00	TAXI	1700 Boulevard Taschereau Longueuil J4G 1A4	\N	\N	Hopital Anna-Laberge, 200 Boul. Brisebois Chateauguay J6K 4W8	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.682469	2026-04-22 22:29:37.682469
03ac7d51-dfdb-43df-8e6b-396e2d09aff7	T2026041506	2026-04-15	14:35:00	15:56:00	TAXI	1730 Eiffel RUE Boucherville J4B 7W1	\N	\N	Hopital Anna-Laberge, 200 Boul. Brisebois Chateauguay J6K 4W8	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.686769	2026-04-22 22:29:37.686769
6a2fac43-c11b-405e-917d-41557cd722cc	T2026041507	2026-04-15	16:09:00	17:19:00	TAXI	150 Rue du Boisé Varennes J3X 1N4	\N	\N	Clinique Medicale Sainte-Julie, 585 Rue Saint-Louis Sainte-Julie J3E 2A8	\N	\N	\N	en_attente	Patient fragile — conduite prudente	2026-04-22 22:29:37.697372	2026-04-22 22:29:37.697372
3d376ac2-dcc6-4dec-b879-388ac5cb8774	T2026041508	2026-04-15	17:31:00	18:30:00	TAXI	5515 Saint-Jacques Montreal H4A 3A2	\N	\N	Hopital Santa Cabrini, 5655 Rue Saint-Zotique E Montreal H1T 1P7	\N	\N	\N	en_attente	Accompagnateur présent	2026-04-22 22:29:37.702107	2026-04-22 22:29:37.702107
1bde93da-561f-4354-ae0c-3eb17e7047b1	T2026041509	2026-04-15	19:10:00	20:43:00	TAXI	1800 Henri-Blaquiere RUE Chambly J3L 3E9	\N	\N	CLSC Longueuil-Est, 1905 Rue Alexandre-de-Sève Longueuil J4K 2P8	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.706867	2026-04-22 22:29:37.706867
d6b7e170-df16-43c4-97f2-eefd2720af50	T2026041601	2026-04-16	06:22:00	07:41:00	TAXI	2000 Chemin du Tremblay Boucherville J4B 6Y1	\N	\N	Hopital Jean-Talon, 1385 Rue Jean-Talon E Montreal H2E 1S6	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.711147	2026-04-22 22:29:37.711147
ed5b7f52-6baa-42e7-a8b0-1aded5872b5c	T2026041602	2026-04-16	08:13:00	08:58:00	TAXI	5515 Saint-Jacques Montreal H4A 3A2	\N	\N	Clinique Rive-Sud, 5320 Cousineau Brossard J4Y 2X2	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.715389	2026-04-22 22:29:37.715389
807f4759-b8c6-4bd0-a1d5-5a7e2600ba61	T2026041603	2026-04-16	09:17:00	09:46:00	TAXI	5515 Saint-Jacques Montreal H4A 3A2	\N	\N	Hopital Maisonneuve-Rosemont, 5415 Boul. Assomption Montreal H1T 2M4	\N	\N	\N	en_attente	Accompagnateur présent	2026-04-22 22:29:37.71989	2026-04-22 22:29:37.71989
f54e0f6f-dad1-4de3-9296-98a6508fa530	T2026041604	2026-04-16	09:56:00	11:21:00	TAXI	2505 Rue Ontario E Montreal H2K 1X3	\N	\N	Clinique Rive-Sud, 5320 Cousineau Brossard J4Y 2X2	\N	\N	\N	en_attente	Accès fauteuil roulant	2026-04-22 22:29:37.72398	2026-04-22 22:29:37.72398
e1ad6fef-ecbe-4c2b-a18a-e5a54fe89f55	T2026041605	2026-04-16	11:37:00	12:22:00	TAXI	227 du Golf RUE Mont-Saint-Hilaire J3H 5Z8	\N	\N	Clinique Rive-Sud, 5320 Cousineau Brossard J4Y 2X2	\N	\N	\N	en_attente	Accompagnateur présent	2026-04-22 22:29:37.729236	2026-04-22 22:29:37.729236
2843a63e-df09-4c0b-97fb-afb2b0dc17af	T2026041701	2026-04-17	06:15:00	06:48:00	TAXI	5515 Saint-Jacques Montreal H4A 3A2	\N	\N	CHUM, 1000 Rue Saint-Denis, Montreal H2X 0C1	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.733455	2026-04-22 22:29:37.733455
10dbc737-e417-49b4-bdb0-6fe869c936b2	T2026041702	2026-04-17	07:28:00	08:41:00	BERLINE	88 Rue des Seigneurs Longueuil J4H 1W2	\N	\N	CLSC Longueuil-Est, 1905 Rue Alexandre-de-Sève Longueuil J4K 2P8	\N	\N	\N	en_attente	Retour à confirmer	2026-04-22 22:29:37.737494	2026-04-22 22:29:37.737494
f30932be-6b7c-4f73-938a-72561f3b1457	T2026041703	2026-04-17	08:54:00	09:42:00	TAXI	2000 Chemin du Tremblay Boucherville J4B 6Y1	\N	\N	CHUM, 1000 Rue Saint-Denis, Montreal H2X 0C1	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.741794	2026-04-22 22:29:37.741794
f55a8c01-33f5-4c7b-98af-41c98730ec0a	T2026041704	2026-04-17	09:54:00	11:13:00	TAXI	730 Abbe-Theoret AV Sainte-Julie J3E 0E1	\N	\N	Hopital Maisonneuve-Rosemont, 5415 Boul. Assomption Montreal H1T 2M4	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.745925	2026-04-22 22:29:37.745925
2c2cbf8c-9ff1-4559-aec4-18569fbba388	T2026041801	2026-04-18	06:36:00	07:48:00	TAXI	450 Rue Sherbrooke E Montreal H2L 1J7	\N	\N	Hopital Anna-Laberge, 200 Boul. Brisebois Chateauguay J6K 4W8	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.749735	2026-04-22 22:29:37.749735
fc48e7f0-a039-41c1-ac63-dd8a6baa71d3	T2026041802	2026-04-18	08:05:00	08:53:00	BERLINE	2100 Boulevard Lapiniere Brossard J4W 2T5	\N	\N	Hopital du Sacre-Coeur, 5400 Gouin O Montreal H4J 1C5	\N	\N	\N	en_attente	Appeler à l'arrivée	2026-04-22 22:29:37.753741	2026-04-22 22:29:37.753741
9b4265b7-38cb-4ec0-9657-c02a9a606d82	T2026041901	2026-04-19	06:26:00	07:47:00	TAXI	980 Rue Sagard Montreal H2C 2X1	\N	\N	Hopital Maisonneuve-Rosemont, 5415 Boul. Assomption Montreal H1T 2M4	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.758082	2026-04-22 22:29:37.758082
185f83ad-32a9-4668-b60e-9c165930a685	T2026041902	2026-04-19	08:06:00	09:17:00	TAXI	1070 Rue Sanguinet Montreal H2X 3E3	\N	\N	CHUM, 1000 Rue Saint-Denis, Montreal H2X 0C1	\N	\N	\N	en_attente	Accompagnateur présent	2026-04-22 22:29:37.763225	2026-04-22 22:29:37.763225
b11aa6dd-e26f-4f43-8210-3006ebf4726f	T2026041903	2026-04-19	09:31:00	10:24:00	TAXI	88 Rue des Seigneurs Longueuil J4H 1W2	\N	\N	Polyclinique de Longueuil, 800 Ch. Tiffin Longueuil J4P 3J7	\N	\N	\N	en_attente	Retour à confirmer	2026-04-22 22:29:37.767345	2026-04-22 22:29:37.767345
786c2468-0d06-4b7f-8a67-f48acdbe8ce1	T2026042001	2026-04-20	06:29:00	07:32:00	TAXI	1730 Eiffel RUE Boucherville J4B 7W1	\N	\N	Centre Hospitalier Pierre-Boucher, 1333 Montarville Longueuil J4M 2A5	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.77319	2026-04-22 22:29:37.77319
b3243e9c-481e-4c0d-9831-9bd2c0394ee1	T2026042002	2026-04-20	08:06:00	09:18:00	TAXI	61 De Montbrun RUE Boucherville J4B 5T3	\N	\N	Hopital Maisonneuve-Rosemont, 5415 Boul. Assomption Montreal H1T 2M4	\N	\N	\N	en_attente	Appeler à l'arrivée	2026-04-22 22:29:37.777333	2026-04-22 22:29:37.777333
7d468837-4794-4e96-bdc2-03d4d5327bc7	T2026042003	2026-04-20	09:41:00	10:26:00	BERLINE	2000 Chemin du Tremblay Boucherville J4B 6Y1	\N	\N	Hopital Jean-Talon, 1385 Rue Jean-Talon E Montreal H2E 1S6	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.781339	2026-04-22 22:29:37.781339
e457bcb7-93b1-4539-b767-18c431681aa9	T2026042004	2026-04-20	10:56:00	12:08:00	TAXI	3400 de Maisonneuve O Montreal H3Z 3B8	\N	\N	Hopital Maisonneuve-Rosemont, 5415 Boul. Assomption Montreal H1T 2M4	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.785209	2026-04-22 22:29:37.785209
9e4e4784-085b-46a3-a15c-73291833fd5b	T2026042005	2026-04-20	12:33:00	14:02:00	TAXI	3355 Autoroute Laval H7T 0H4	\N	\N	Clinique Rive-Sud, 5320 Cousineau Brossard J4Y 2X2	\N	\N	\N	en_attente	Patient fragile — conduite prudente	2026-04-22 22:29:37.789404	2026-04-22 22:29:37.789404
31760bdd-5ab6-4347-b8b5-fa9dee51bb4b	T2026042006	2026-04-20	14:26:00	15:07:00	TAXI	1070 Rue Sanguinet Montreal H2X 3E3	\N	\N	Centre Hospitalier Pierre-Boucher, 1333 Montarville Longueuil J4M 2A5	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.793682	2026-04-22 22:29:37.793682
e34b4cf7-4431-43a1-af39-0029f1f1a998	T2026042007	2026-04-20	15:38:00	17:13:00	TAXI	3400 de Maisonneuve O Montreal H3Z 3B8	\N	\N	Centre Hospitalier Pierre-Boucher, 1333 Montarville Longueuil J4M 2A5	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.798318	2026-04-22 22:29:37.798318
135c42d4-e473-4680-bbe1-579387c9e008	T2026042101	2026-04-21	06:36:00	07:24:00	BERLINE	150 Rue du Boisé Varennes J3X 1N4	\N	\N	CLSC Longueuil-Est, 1905 Rue Alexandre-de-Sève Longueuil J4K 2P8	\N	\N	\N	en_attente	Retour à confirmer	2026-04-22 22:29:37.803569	2026-04-22 22:29:37.803569
e96fea9d-487d-4570-8c2e-9ebc43703e55	MOB-TRJ-20260423	2026-04-23	09:00:00	10:00:00	TAXI	1 Rue Test, Montréal H0H 0H0	\N	\N	CHUM, 1000 Rue Saint-Denis, Montréal H2X 0C1	\N	\N	\N	en_attente	Trajet de test mobile	2026-04-23 05:04:47.580468	2026-04-23 05:04:47.580468
abbe142c-c3cc-44ad-a506-c33f0959de27	EXO-0629-002	2026-06-29	12:30:00	13:04:00	BERLINE	88 Rue Jules-Choquet J3X2H1 Varennes	45.6834691	-73.4362737	1111 Rue St-Charles Ouest J4K5G4 Longueuil	45.5261385	-73.5199472	\N	en_attente	Client: Sylvain Fournier | Retour rendez-vous médical	2026-06-28 01:19:16.749449	2026-06-28 01:19:16.749449
7d33dfaf-7bad-4dde-85fb-069d6aa5dd62	EXO-0629-003	2026-06-29	14:20:00	14:57:00	BERLINE	45 Avenue des Pins J3X2K4 Varennes	45.6834691	-73.4362737	1000 Rue Sherbrooke H3A1G4 Montréal	45.5027317	-73.5750886	\N	en_attente	Client: Pierre Côté | Bagages volumineux	2026-06-28 01:19:16.755219	2026-06-28 01:19:16.755219
625adf4f-2adf-498a-bf34-8d0347748a27	EXO-0629-005	2026-06-29	08:45:00	09:10:00	VAN	45 Avenue des Pins J3X2K4 Varennes	45.6834691	-73.4362737	500 Boul René-Lévesque H2Z1A1 Montréal	45.4683975	-73.5353150	\N	en_attente	Client: Stéphane Gauthier | Accompagnateur présent	2026-06-28 01:19:16.763393	2026-06-28 01:19:16.763393
f557debd-395e-407e-9467-347b41bf049a	EXO-0630-015	2026-06-30	13:30:00	14:18:00	TAXI	250 Boul de la Marine J3X1G8 Varennes	\N	\N	2200 Rue University H3A2A6 Montréal	\N	\N	\N	en_attente	Client: Julie Simard | Client en fauteuil roulant	2026-06-27 21:36:50.706178	2026-06-27 21:36:50.706178
7c91504e-e5b4-491c-a032-24e0d8d38421	EXO-0630-016	2026-06-30	14:50:00	15:26:00	VAN	5 Place du Marché J3X1A9 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: André Morin	2026-06-27 21:36:50.711978	2026-06-27 21:36:50.711978
552834b3-e86d-4404-a4c6-6b9d0adbfb9c	EXO-0630-017	2026-06-30	17:15:00	17:39:00	VAN	88 Rue Jules-Choquet J3X2H1 Varennes	\N	\N	5400 Boul Gouin Ouest H4J1C5 Montréal	\N	\N	\N	en_attente	Client: Annie Boucher	2026-06-27 21:36:50.716019	2026-06-27 21:36:50.716019
0d37616d-cd39-4c36-919f-b060684b610f	EXO-0630-018	2026-06-30	18:45:00	19:22:00	BERLINE	250 Boul de la Marine J3X1G8 Varennes	\N	\N	800 Boul de Maisonneuve H3A0A9 Montréal	\N	\N	\N	en_attente	Client: André Côté	2026-06-27 21:36:50.720118	2026-06-27 21:36:50.720118
da4681a7-fda7-4f6a-9b6a-f73aa34dbd65	EXO-0630-019	2026-06-30	07:55:00	08:36:00	VAN	15 Rue de la Gare J3X1T9 Varennes	\N	\N	2200 Rue University H3A2A6 Montréal	\N	\N	\N	en_attente	Client: Annie Girard	2026-06-27 21:36:50.731335	2026-06-27 21:36:50.731335
264a15f6-50fe-4fc0-b389-9f45bb063af8	EXO-0630-020	2026-06-30	09:00:00	09:31:00	BERLINE	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	150 Rue Peel H3C2G8 Montréal	\N	\N	\N	en_attente	Client: André Lévesque	2026-06-27 21:36:50.736166	2026-06-27 21:36:50.736166
88e004c7-e41d-46bc-b5c3-0bfd3f0e723d	EXO-0630-021	2026-06-30	06:00:00	06:36:00	TAXI	410 Rang du Bord-de-l'eau J3X0K2 Varennes	\N	\N	1051 Rue Sanguinet H2X3E4 Montréal	\N	\N	\N	en_attente	Client: Sophie Morin | Client en fauteuil roulant	2026-06-27 21:36:50.746297	2026-06-27 21:36:50.746297
ad127ac0-63b4-4e54-bef1-c7e914cd347a	EXO-0630-022	2026-06-30	15:20:00	15:57:00	VAN	78 Chemin du Fleuve J3X1R2 Varennes	\N	\N	800 Boul de Maisonneuve H3A0A9 Montréal	\N	\N	\N	en_attente	Client: Michel Cloutier | Client en fauteuil roulant	2026-06-27 21:36:50.750772	2026-06-27 21:36:50.750772
203f29c5-bcc1-445a-8c38-cb3488a967d2	EXO-0702-018	2026-07-02	08:25:00	08:58:00	BERLINE	45 Avenue des Pins J3X2K4 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: Josée Caron | Bagages volumineux	2026-06-27 21:37:12.568574	2026-06-27 21:37:12.568574
77ddcb1b-b21f-4e2a-a04f-a94faf21bfc0	EXO-0702-019	2026-07-02	07:55:00	08:42:00	VAN	78 Chemin du Fleuve J3X1R2 Varennes	\N	\N	500 Boul René-Lévesque H2Z1A1 Montréal	\N	\N	\N	en_attente	Client: Mélanie Fortin | Retour rendez-vous médical	2026-06-27 21:37:12.572484	2026-06-27 21:37:12.572484
f68b0998-cd85-4ff9-985a-c0918e96aaff	EXO-0702-020	2026-07-02	09:25:00	10:04:00	TAXI	15 Rue de la Gare J3X1T9 Varennes	\N	\N	1000 Rue Sherbrooke H3A1G4 Montréal	\N	\N	\N	en_attente	Client: Nathalie Nadeau | Client en fauteuil roulant	2026-06-27 21:37:12.57791	2026-06-27 21:37:12.57791
d38190aa-8abc-4024-9590-1d75627bbc6c	EXO-0702-021	2026-07-02	08:50:00	09:33:00	BERLINE	5 Place du Marché J3X1A9 Varennes	\N	\N	5400 Boul Gouin Ouest H4J1C5 Montréal	\N	\N	\N	en_attente	Client: Luc Lefebvre	2026-06-27 21:37:12.587192	2026-06-27 21:37:12.587192
971f7ecd-55c6-4996-b547-4df8b4ce0be2	EXO-0702-022	2026-07-02	11:10:00	11:39:00	BERLINE	120 Rue Principale J3X1P7 Varennes	\N	\N	1051 Rue Sanguinet H2X3E4 Montréal	\N	\N	\N	en_attente	Client: Geneviève Beaulieu	2026-06-27 21:37:12.591168	2026-06-27 21:37:12.591168
1fbadf42-2194-4d53-9b54-216f726dab1e	EXO-0702-023	2026-07-02	15:25:00	15:52:00	TAXI	300 Montée de Picardie J3X0B5 Varennes	\N	\N	2200 Rue University H3A2A6 Montréal	\N	\N	\N	en_attente	Client: Martin Bergeron | Accompagnateur présent	2026-06-27 21:37:12.594888	2026-06-27 21:37:12.594888
65b39f44-6d36-486e-8aca-d0b533e0cf3e	EXO-0702-024	2026-07-02	16:35:00	17:09:00	VAN	45 Avenue des Pins J3X2K4 Varennes	\N	\N	800 Boul de Maisonneuve H3A0A9 Montréal	\N	\N	\N	en_attente	Client: André Lévesque	2026-06-27 21:37:12.599127	2026-06-27 21:37:12.599127
f7a36e75-7bee-4d94-a600-624d96dad728	EXO-0702-025	2026-07-02	06:30:00	07:12:00	TAXI	5 Place du Marché J3X1A9 Varennes	\N	\N	800 Boul de Maisonneuve H3A0A9 Montréal	\N	\N	\N	en_attente	Client: Sophie Simard | Accompagnateur présent	2026-06-27 21:37:12.605428	2026-06-27 21:37:12.605428
37384548-5160-444d-b92d-98dc703a6b46	EXO-0703-001	2026-07-03	18:35:00	18:56:00	TAXI	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	1000 Rue Sherbrooke H3A1G4 Montréal	\N	\N	\N	en_attente	Client: Stéphane Bergeron | Retour rendez-vous médical	2026-06-27 21:37:12.684595	2026-06-27 21:37:12.684595
eb4f916c-c60c-43a7-9fb4-79e8507b71b2	EXO-0703-002	2026-07-03	11:40:00	12:30:00	BERLINE	78 Chemin du Fleuve J3X1R2 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: Michel Bélanger	2026-06-27 21:37:12.690466	2026-06-27 21:37:12.690466
8bb730fb-1694-40fc-a750-1fe9cb05440d	EXO-0703-003	2026-07-03	12:00:00	12:42:00	TAXI	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: André Dubé	2026-06-27 21:37:12.704542	2026-06-27 21:37:12.704542
22248dae-ff09-4dbe-a4c5-1f4d2f67a3d2	EXO-0703-004	2026-07-03	16:40:00	17:12:00	BERLINE	410 Rang du Bord-de-l'eau J3X0K2 Varennes	\N	\N	5400 Boul Gouin Ouest H4J1C5 Montréal	\N	\N	\N	en_attente	Client: Stéphane Simard | Client en fauteuil roulant	2026-06-27 21:37:12.709296	2026-06-27 21:37:12.709296
585d84b3-d5cf-41fd-bb9e-091036ae6000	EXO-0703-005	2026-07-03	11:55:00	12:20:00	TAXI	78 Chemin du Fleuve J3X1R2 Varennes	\N	\N	900 Boul St-Joseph J4B5E5 Longueuil	\N	\N	\N	en_attente	Client: Mélanie Beaulieu | Client en fauteuil roulant	2026-06-27 21:37:12.713986	2026-06-27 21:37:12.713986
8f79fb46-55d2-457f-99ce-6ab63ea4392f	EXO-0703-006	2026-07-03	11:10:00	11:38:00	VAN	120 Rue Principale J3X1P7 Varennes	\N	\N	5400 Boul Gouin Ouest H4J1C5 Montréal	\N	\N	\N	en_attente	Client: Caroline Beaulieu	2026-06-27 21:37:12.718137	2026-06-27 21:37:12.718137
6eb408cf-8524-4380-b6ee-bdf62713d8b5	EXO-0703-007	2026-07-03	17:40:00	18:20:00	BERLINE	78 Chemin du Fleuve J3X1R2 Varennes	\N	\N	500 Boul René-Lévesque H2Z1A1 Montréal	\N	\N	\N	en_attente	Client: Jean Morin	2026-06-27 21:37:12.7273	2026-06-27 21:37:12.7273
ac811195-827d-4b88-b9f5-b5bcf8589cbf	EXO-0703-008	2026-07-03	11:05:00	11:29:00	TAXI	88 Rue Jules-Choquet J3X2H1 Varennes	\N	\N	1000 Rue Sherbrooke H3A1G4 Montréal	\N	\N	\N	en_attente	Client: Geneviève Pelletier	2026-06-27 21:37:12.734858	2026-06-27 21:37:12.734858
d976bfc9-ab51-4711-bbe5-32a81b930b48	EXO-0703-009	2026-07-03	12:55:00	13:40:00	TAXI	5 Place du Marché J3X1A9 Varennes	\N	\N	500 Boul René-Lévesque H2Z1A1 Montréal	\N	\N	\N	en_attente	Client: Michel Morin | Appeler avant l'arrivée	2026-06-27 21:37:12.738976	2026-06-27 21:37:12.738976
469f67e4-88cf-4f4b-bdc6-0ecc91c103d9	EXO-0703-010	2026-07-03	18:25:00	19:06:00	BERLINE	300 Montée de Picardie J3X0B5 Varennes	\N	\N	1111 Rue St-Charles Ouest J4K5G4 Longueuil	\N	\N	\N	en_attente	Client: Robert Pelletier	2026-06-27 21:37:12.744045	2026-06-27 21:37:12.744045
624366af-40d1-4b7e-bb33-37bd5828048d	EXO-0629-007	2026-06-29	09:50:00	10:31:00	TAXI	410 Rang du Bord-de-l'eau J3X0K2 Varennes	45.6834691	-73.4362737	500 Boul René-Lévesque H2Z1A1 Montréal	45.4683975	-73.5353150	\N	en_attente	Client: Isabelle Beaulieu | Retour rendez-vous médical	2026-06-28 01:19:16.772412	2026-06-28 01:19:16.772412
3dca3c21-0ebb-4e7b-b463-849b61ac1509	EXO-0629-008	2026-06-29	13:15:00	13:59:00	TAXI	12 Rue Sainte-Anne J3X1C3 Varennes	45.6774702	-73.4383687	1111 Rue St-Charles Ouest J4K5G4 Longueuil	45.5261385	-73.5199472	\N	en_attente	Client: Annie Lefebvre | Retour rendez-vous médical	2026-06-28 01:19:16.780579	2026-06-28 01:19:16.780579
aba580c6-d86e-4996-b8f2-03d62fc2f2f8	EXO-0629-009	2026-06-29	10:25:00	10:46:00	TAXI	250 Boul de la Marine J3X1G8 Varennes	45.6582953	-73.4249290	900 Boul St-Joseph J4B5E5 Longueuil	45.5219060	-73.4644578	\N	en_attente	Client: Marie Lavoie	2026-06-28 01:19:16.785264	2026-06-28 01:19:16.785264
11ae5724-077e-4663-b287-e24c54fc221e	EXO-0629-010	2026-06-29	08:35:00	09:01:00	BERLINE	120 Rue Principale J3X1P7 Varennes	45.6834691	-73.4362737	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	45.5034404	-73.6244677	\N	en_attente	Client: Émilie Bouchard | Transport 4 personnes	2026-06-28 01:19:16.789613	2026-06-28 01:19:16.789613
882ff7c3-4b91-4493-b994-a2793a8dccd0	EXO-0629-011	2026-06-29	13:50:00	14:30:00	VAN	12 Rue Sainte-Anne J3X1C3 Varennes	45.6774702	-73.4383687	800 Boul de Maisonneuve H3A0A9 Montréal	45.5161662	-73.5600410	\N	en_attente	Client: Isabelle Fournier	2026-06-28 01:19:16.793818	2026-06-28 01:19:16.793818
c6883310-6136-429b-a51e-3a60df7795d2	EXO-0629-012	2026-06-29	11:00:00	11:27:00	BERLINE	45 Avenue des Pins J3X2K4 Varennes	45.6834691	-73.4362737	5400 Boul Gouin Ouest H4J1C5 Montréal	45.5329010	-73.7150756	\N	en_attente	Client: Marie Cloutier | Appeler avant l'arrivée	2026-06-28 01:19:16.799867	2026-06-28 01:19:16.799867
66434ef2-23c7-4615-9e27-7451e78bff20	EXO-0629-013	2026-06-29	08:00:00	08:21:00	TAXI	88 Rue Jules-Choquet J3X2H1 Varennes	45.6834691	-73.4362737	800 Boul de Maisonneuve H3A0A9 Montréal	45.5161662	-73.5600410	\N	en_attente	Client: Nathalie Lefebvre	2026-06-28 01:19:16.808692	2026-06-28 01:19:16.808692
e561260c-c39a-4720-ac40-58cd5fccdd6c	EXO-0629-014	2026-06-29	06:45:00	07:06:00	TAXI	12 Rue Sainte-Anne J3X1C3 Varennes	45.6774702	-73.4383687	5400 Boul Gouin Ouest H4J1C5 Montréal	45.5329010	-73.7150756	\N	en_attente	Client: Josée Girard	2026-06-28 01:19:16.812769	2026-06-28 01:19:16.812769
8768a8e2-2961-42fa-acbd-d2304a9173d4	EXO-0629-015	2026-06-29	16:25:00	16:51:00	VAN	5 Place du Marché J3X1A9 Varennes	45.6834691	-73.4362737	500 Boul René-Lévesque H2Z1A1 Montréal	45.4683975	-73.5353150	\N	en_attente	Client: Martin Pelletier | Appeler avant l'arrivée	2026-06-28 01:19:16.816951	2026-06-28 01:19:16.816951
286c824c-4645-4cc9-a02a-ecd36dc59141	EXO-0701-001	2026-07-01	06:10:00	06:52:00	VAN	410 Rang du Bord-de-l'eau J3X0K2 Varennes	\N	\N	1111 Rue St-Charles Ouest J4K5G4 Longueuil	\N	\N	\N	en_attente	Client: André Girard	2026-06-27 21:37:12.305985	2026-06-27 21:37:12.305985
ca6d86db-0382-4079-a4f3-01cbbb8a8a55	EXO-0701-002	2026-07-01	14:30:00	14:58:00	TAXI	410 Rang du Bord-de-l'eau J3X0K2 Varennes	\N	\N	1000 Rue Sherbrooke H3A1G4 Montréal	\N	\N	\N	en_attente	Client: Sandra Gagnon	2026-06-27 21:37:12.313578	2026-06-27 21:37:12.313578
55c6a4c4-399d-4945-9e95-c7594cdced68	EXO-0701-003	2026-07-01	15:20:00	15:44:00	VAN	78 Chemin du Fleuve J3X1R2 Varennes	\N	\N	1111 Rue St-Charles Ouest J4K5G4 Longueuil	\N	\N	\N	en_attente	Client: André Côté	2026-06-27 21:37:12.319446	2026-06-27 21:37:12.319446
eecdeb2c-163d-4db2-ab2f-606c2c4a1dfd	EXO-0701-004	2026-07-01	18:45:00	19:25:00	BERLINE	5 Place du Marché J3X1A9 Varennes	\N	\N	1000 Rue Sherbrooke H3A1G4 Montréal	\N	\N	\N	en_attente	Client: Martin Lefebvre | Client en fauteuil roulant	2026-06-27 21:37:12.323132	2026-06-27 21:37:12.323132
3002069a-dde2-4bd1-a4cb-9b7fde6ca85c	EXO-0701-005	2026-07-01	15:45:00	16:27:00	VAN	250 Boul de la Marine J3X1G8 Varennes	\N	\N	2200 Rue University H3A2A6 Montréal	\N	\N	\N	en_attente	Client: Sylvain Cloutier	2026-06-27 21:37:12.326996	2026-06-27 21:37:12.326996
04201c21-b670-4cdb-957d-eee1adc40ed6	EXO-0701-006	2026-07-01	06:00:00	06:27:00	BERLINE	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	1051 Rue Sanguinet H2X3E4 Montréal	\N	\N	\N	en_attente	Client: Michel Fournier | Bagages volumineux	2026-06-27 21:37:12.330852	2026-06-27 21:37:12.330852
2a24fa35-753a-487b-a96c-0a72b346a81c	EXO-0701-007	2026-07-01	09:10:00	09:53:00	TAXI	45 Avenue des Pins J3X2K4 Varennes	\N	\N	500 Boul René-Lévesque H2Z1A1 Montréal	\N	\N	\N	en_attente	Client: Nathalie Ouellet | Transport 4 personnes	2026-06-27 21:37:12.334757	2026-06-27 21:37:12.334757
5e844000-d171-461a-885b-9669671e2a65	EXO-0629-016	2026-06-29	15:15:00	15:45:00	BERLINE	78 Chemin du Fleuve J3X1R2 Varennes	45.6834691	-73.4362737	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	45.5034404	-73.6244677	\N	en_attente	Client: Josée Morin	2026-06-28 01:19:16.821486	2026-06-28 01:19:16.821486
e98497fb-82de-4f39-bb95-ab795b29fe6f	EXO-0629-017	2026-06-29	16:50:00	17:21:00	BERLINE	45 Avenue des Pins J3X2K4 Varennes	45.6834691	-73.4362737	5400 Boul Gouin Ouest H4J1C5 Montréal	45.5329010	-73.7150756	\N	en_attente	Client: Geneviève Côté | Bagages volumineux	2026-06-28 01:19:16.825913	2026-06-28 01:19:16.825913
6f3eafb4-6fef-463b-a0ae-0583d4d09ec4	EXO-0629-018	2026-06-29	17:20:00	17:40:00	TAXI	300 Montée de Picardie J3X0B5 Varennes	45.6912944	-73.4285024	1000 Rue Sherbrooke H3A1G4 Montréal	45.5027317	-73.5750886	\N	en_attente	Client: Robert Caron | Bagages volumineux	2026-06-28 01:19:16.831329	2026-06-28 01:19:16.831329
59e0411b-7c71-4c5a-bc3c-fd295f49ee2b	EXO-0629-019	2026-06-29	13:15:00	13:38:00	VAN	88 Rue Jules-Choquet J3X2H1 Varennes	45.6834691	-73.4362737	5400 Boul Gouin Ouest H4J1C5 Montréal	45.5329010	-73.7150756	\N	en_attente	Client: Luc Caron	2026-06-28 01:19:16.835827	2026-06-28 01:19:16.835827
61015a38-b656-40be-b645-6333c47af4b4	EXO-0629-020	2026-06-29	06:40:00	07:08:00	BERLINE	5 Place du Marché J3X1A9 Varennes	45.6834691	-73.4362737	500 Boul René-Lévesque H2Z1A1 Montréal	45.4683975	-73.5353150	\N	en_attente	Client: Isabelle Girard	2026-06-28 01:19:16.840239	2026-06-28 01:19:16.840239
69249263-3a4c-440a-bce3-b5493303ad7b	EXO-0629-021	2026-06-29	16:35:00	17:13:00	VAN	45 Avenue des Pins J3X2K4 Varennes	45.6834691	-73.4362737	150 Rue Peel H3C2G8 Montréal	45.4972222	-73.5674172	\N	en_attente	Client: Geneviève Roy | Accompagnateur présent	2026-06-28 01:19:16.844679	2026-06-28 01:19:16.844679
abdab84f-3853-4cd5-b150-dd29230e96de	EXO-0629-022	2026-06-29	10:15:00	10:40:00	TAXI	250 Boul de la Marine J3X1G8 Varennes	45.6582953	-73.4249290	800 Boul de Maisonneuve H3A0A9 Montréal	45.5161662	-73.5600410	\N	en_attente	Client: Mélanie Poirier | Accompagnateur présent	2026-06-28 01:19:16.851762	2026-06-28 01:19:16.851762
21204842-38cc-4d06-802b-a4cd8f8de065	EXO0704-007	2026-07-04	06:45:00	07:38:00	TAXI	150 Av. Cartier, Pointe-Claire H9S 4N8 Pointe-Claire	\N	\N	2200 Rue Pie-IX, Montréal H1V 2E6 Montréal	\N	\N	\N	en_attente	Client: Cantin Louise	2026-06-27 04:17:41.347034	2026-06-27 04:17:41.347034
b50d0f3d-428c-4e7c-9b89-b50728083756	EXO0704-010	2026-07-04	07:15:00	08:21:00	TAXI	450 Rue Principale, Varennes J3X 1S1 Varennes	\N	\N	320 Rue Ste-Anne, Sainte-Julie J3E 0E1 Sainte-Julie	\N	\N	\N	en_attente	Client: Côté François | Patient dialyse	2026-06-27 04:17:41.354661	2026-06-27 04:17:41.354661
e6378b67-2033-4289-822f-b0e42925e2c1	EXO0704-012	2026-07-04	07:45:00	08:54:00	BERLINE	750 Rue Ampère, Boucherville J4B 7M5 Boucherville	\N	\N	600 Rue Bélanger, Montréal H2S 1H2 Montréal	\N	\N	\N	en_attente	Client: Pelletier Jacques	2026-06-27 04:17:41.363871	2026-06-27 04:17:41.363871
d2182b19-1c99-4750-ac57-d112f9e1b766	EXO0704-011	2026-07-04	08:30:00	09:33:00	BERLINE	150 Av. Cartier, Pointe-Claire H9S 4N8 Pointe-Claire	\N	\N	440 Boul. De Maisonneuve O, Montréal H3A 1L6 Montréal	\N	\N	\N	en_attente	Client: Poirier Claude	2026-06-27 04:17:41.369001	2026-06-27 04:17:41.369001
856fd214-f791-4c82-96d8-f6ab7ebce0f7	EXO0704-003	2026-07-04	09:00:00	10:00:00	BERLINE	600 Rue Bélanger, Montréal H2S 1H2 Montréal	\N	\N	1100 Rue du Parc, Saint-Bruno J3V 2A1 Saint-Bruno	\N	\N	\N	en_attente	Client: Bergeron Nicole	2026-06-27 04:17:41.374769	2026-06-27 04:17:41.374769
623bf636-690a-4f47-a201-8cfeaa622e82	EXO0704-008	2026-07-04	09:30:00	10:40:00	MINIBUS	750 Rue Ampère, Boucherville J4B 7M5 Boucherville	\N	\N	600 Rue Bélanger, Montréal H2S 1H2 Montréal	\N	\N	\N	en_attente	Client: Leblanc Denis | Patient dialyse	2026-06-27 04:17:41.380606	2026-06-27 04:17:41.380606
625b99a6-a7b1-43e4-a00d-f88a4790dd02	EXO0704-009	2026-07-04	09:30:00	10:45:00	BERLINE	600 Rue Bélanger, Montréal H2S 1H2 Montréal	\N	\N	300 Rue Herron, Dorval H9S 4N8 Dorval	\N	\N	\N	en_attente	Client: Poirier Claude	2026-06-27 04:17:41.384753	2026-06-27 04:17:41.384753
4a0685cd-13d4-4c04-94af-9f2cff93f9d7	EXO0704-004	2026-07-04	09:45:00	10:38:00	BERLINE	440 Boul. De Maisonneuve O, Montréal H3A 1L6 Montréal	\N	\N	580 Rue Notre-Dame, Saint-Lambert J4P 2K8 Saint-Lambert	\N	\N	\N	en_attente	Client: Lavoie Julie	2026-06-27 04:17:41.389787	2026-06-27 04:17:41.389787
b423cdf2-99d9-4eff-afd4-ced495720c9f	EXO0704-005	2026-07-04	10:00:00	11:04:00	TAXI	150 Av. Cartier, Pointe-Claire H9S 4N8 Pointe-Claire	\N	\N	1000 Saint-Denis, Montréal H2X 0C1 Montréal	\N	\N	\N	en_attente	Client: Gauthier André	2026-06-27 04:17:41.393854	2026-06-27 04:17:41.393854
27dd6bd7-8714-4b63-9bc5-7ffae5055123	EXO0704-014	2026-07-04	11:30:00	11:56:00	TAXI	1000 Saint-Denis, Montréal H2X 0C1 Montréal	\N	\N	750 Rue Ampère, Boucherville J4B 7M5 Boucherville	\N	\N	\N	en_attente	Client: Poirier Claude	2026-06-27 04:17:41.39967	2026-06-27 04:17:41.39967
4f0cb31c-c120-4006-8e25-894a0dbd55de	EXO0704-013	2026-07-04	14:45:00	15:38:00	MINIBUS	1000 Saint-Denis, Montréal H2X 0C1 Montréal	\N	\N	300 Rue Herron, Dorval H9S 4N8 Dorval	\N	\N	\N	en_attente	Client: Tremblay Sophie | Animal de compagnie	2026-06-27 04:17:41.404632	2026-06-27 04:17:41.404632
2090c71c-4737-4167-bcb4-b66d4f10dd78	EXO0704-002	2026-07-04	15:00:00	15:34:00	TAXI	450 Rue Principale, Varennes J3X 1S1 Varennes	\N	\N	1500 Rue Sherbrooke E, Montréal H2L 2M4 Montréal	\N	\N	\N	en_attente	Client: Poirier Claude	2026-06-27 04:17:41.409073	2026-06-27 04:17:41.409073
1a10b111-1f3e-4b21-8b35-b2c86d7154a3	EXO0704-006	2026-07-04	16:00:00	16:35:00	TAXI	200 Boul. Sir-Wilfrid-Laurier, Beloeil J3G 4J1 Beloeil	\N	\N	450 Rue Principale, Varennes J3X 1S1 Varennes	\N	\N	\N	en_attente	Client: Mercier Diane | Patient dialyse	2026-06-27 04:17:41.413331	2026-06-27 04:17:41.413331
46754060-c848-4870-8c77-291a8a02454d	EXO0704-016	2026-07-04	16:45:00	18:08:00	MINIBUS	750 Rue Ampère, Boucherville J4B 7M5 Boucherville	\N	\N	450 Rue Principale, Varennes J3X 1S1 Varennes	\N	\N	\N	en_attente	Client: Poirier Claude | Animal de compagnie	2026-06-27 04:17:41.417569	2026-06-27 04:17:41.417569
ed7946e3-3a3d-447c-8e10-7a4028a8c637	EXO0704-015	2026-07-04	18:30:00	19:31:00	BERLINE	1800 Henri-Blaquière, Chambly J3L 3E9 Chambly	\N	\N	1500 Rue Sherbrooke E, Montréal H2L 2M4 Montréal	\N	\N	\N	en_attente	Client: Bouchard Nathalie | Bagages volumineux	2026-06-27 04:17:41.422025	2026-06-27 04:17:41.422025
beafe72a-014b-4d14-9f45-5ada9cf553d5	EXO0704-001	2026-07-04	19:45:00	20:17:00	TAXI	1500 Rue Sherbrooke E, Montréal H2L 2M4 Montréal	\N	\N	1000 Saint-Denis, Montréal H2X 0C1 Montréal	\N	\N	\N	en_attente	Client: Pelletier Jacques | Bagages volumineux	2026-06-27 04:17:41.426153	2026-06-27 04:17:41.426153
54e25bfa-76a3-439a-8980-b8f517300894	EXO0704-017	2026-07-04	19:45:00	20:15:00	TAXI	580 Rue Notre-Dame, Saint-Lambert J4P 2K8 Saint-Lambert	\N	\N	320 Rue Ste-Anne, Sainte-Julie J3E 0E1 Sainte-Julie	\N	\N	\N	en_attente	Client: Bélanger Sylvie	2026-06-27 04:17:41.430402	2026-06-27 04:17:41.430402
cd5b4a16-3c5e-4f59-915c-0ebbaf05fb9a	EXO-0701-008	2026-07-01	17:20:00	17:43:00	BERLINE	120 Rue Principale J3X1P7 Varennes	\N	\N	5400 Boul Gouin Ouest H4J1C5 Montréal	\N	\N	\N	en_attente	Client: André Boucher	2026-06-27 21:37:12.339033	2026-06-27 21:37:12.339033
b7c80bc0-672b-4ce5-a110-18a2ba326e59	EXO-0701-009	2026-07-01	15:15:00	15:50:00	TAXI	15 Rue de la Gare J3X1T9 Varennes	\N	\N	5400 Boul Gouin Ouest H4J1C5 Montréal	\N	\N	\N	en_attente	Client: André Boucher	2026-06-27 21:37:12.343864	2026-06-27 21:37:12.343864
b5019dea-71e1-485a-86eb-82159fb16ee9	EXO-0701-010	2026-07-01	06:15:00	06:59:00	BERLINE	300 Montée de Picardie J3X0B5 Varennes	\N	\N	1051 Rue Sanguinet H2X3E4 Montréal	\N	\N	\N	en_attente	Client: Sandra Côté | Transport 4 personnes	2026-06-27 21:37:12.348117	2026-06-27 21:37:12.348117
55412241-55ce-418e-b15a-e3d11846b362	EXO-0701-011	2026-07-01	10:50:00	11:32:00	TAXI	45 Avenue des Pins J3X2K4 Varennes	\N	\N	900 Boul St-Joseph J4B5E5 Longueuil	\N	\N	\N	en_attente	Client: Sandra Gagnon	2026-06-27 21:37:12.352499	2026-06-27 21:37:12.352499
e46e0e97-e56a-4a0d-8408-2f7346c47ab3	EXO-0701-012	2026-07-01	15:30:00	16:05:00	TAXI	300 Montée de Picardie J3X0B5 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: Émilie Lavoie | Client en fauteuil roulant	2026-06-27 21:37:12.3572	2026-06-27 21:37:12.3572
2a474fd4-87fe-43fc-8bdf-cfb2a9442add	EXO-0701-013	2026-07-01	08:50:00	09:18:00	BERLINE	250 Boul de la Marine J3X1G8 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: Josée Bouchard | Bagages volumineux	2026-06-27 21:37:12.361502	2026-06-27 21:37:12.361502
22226f98-0a43-4145-905b-1c54d72536ee	EXO-0701-014	2026-07-01	13:50:00	14:38:00	TAXI	88 Rue Jules-Choquet J3X2H1 Varennes	\N	\N	1111 Rue St-Charles Ouest J4K5G4 Longueuil	\N	\N	\N	en_attente	Client: Marc Gauthier | Appeler avant l'arrivée	2026-06-27 21:37:12.365487	2026-06-27 21:37:12.365487
904b43bf-7130-4ff9-be45-8b2b122d6519	EXO-0701-015	2026-07-01	09:55:00	10:30:00	VAN	300 Montée de Picardie J3X0B5 Varennes	\N	\N	1000 Rue Sherbrooke H3A1G4 Montréal	\N	\N	\N	en_attente	Client: Caroline Cloutier | Accompagnateur présent	2026-06-27 21:37:12.369404	2026-06-27 21:37:12.369404
52a0e6c0-b886-4a10-981e-ffd2f8f75d3d	EXO-0701-016	2026-07-01	18:00:00	18:47:00	VAN	410 Rang du Bord-de-l'eau J3X0K2 Varennes	\N	\N	900 Boul St-Joseph J4B5E5 Longueuil	\N	\N	\N	en_attente	Client: Luc Gagnon | Bagages volumineux	2026-06-27 21:37:12.37316	2026-06-27 21:37:12.37316
13d0eb15-4c1f-4df1-b522-105823afd573	EXO-0701-017	2026-07-01	08:35:00	09:00:00	VAN	250 Boul de la Marine J3X1G8 Varennes	\N	\N	1111 Rue St-Charles Ouest J4K5G4 Longueuil	\N	\N	\N	en_attente	Client: Robert Fournier	2026-06-27 21:37:12.377024	2026-06-27 21:37:12.377024
e40cf813-c5cf-46a2-80a2-178c008e44ce	EXO-0701-018	2026-07-01	11:50:00	12:33:00	BERLINE	410 Rang du Bord-de-l'eau J3X0K2 Varennes	\N	\N	500 Boul René-Lévesque H2Z1A1 Montréal	\N	\N	\N	en_attente	Client: Jean Lefebvre | Transport 4 personnes	2026-06-27 21:37:12.380917	2026-06-27 21:37:12.380917
6e1b2007-4fda-4ca5-8a19-6989a8ac7043	EXO-0701-019	2026-07-01	17:55:00	18:30:00	BERLINE	410 Rang du Bord-de-l'eau J3X0K2 Varennes	\N	\N	1000 Rue Sherbrooke H3A1G4 Montréal	\N	\N	\N	en_attente	Client: Josée Pelletier | Retour rendez-vous médical	2026-06-27 21:37:12.384921	2026-06-27 21:37:12.384921
6e1a5e73-495d-4a34-bc2e-3e531324a6ff	EXO-0701-020	2026-07-01	16:25:00	17:11:00	VAN	78 Chemin du Fleuve J3X1R2 Varennes	\N	\N	900 Boul St-Joseph J4B5E5 Longueuil	\N	\N	\N	en_attente	Client: Josée Poirier	2026-06-27 21:37:12.38866	2026-06-27 21:37:12.38866
6aca5016-7e9d-4c34-a15c-eab3294160b7	EXO-0701-021	2026-07-01	07:25:00	07:47:00	VAN	78 Chemin du Fleuve J3X1R2 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: Isabelle Lavoie | Retour rendez-vous médical	2026-06-27 21:37:12.395049	2026-06-27 21:37:12.395049
f0d473c6-7787-4b88-bb84-703d097332f2	EXO-0701-022	2026-07-01	07:55:00	08:20:00	TAXI	300 Montée de Picardie J3X0B5 Varennes	\N	\N	2200 Rue University H3A2A6 Montréal	\N	\N	\N	en_attente	Client: Caroline Côté | Bagages volumineux	2026-06-27 21:37:12.407815	2026-06-27 21:37:12.407815
5fefa64d-a68c-4951-aa66-a92e6506a4ee	EXO-0629-001	2026-06-29	09:00:00	09:40:00	BERLINE	5 Place du Marché J3X1A9 Varennes	45.6834691	-73.4362737	1051 Rue Sanguinet H2X3E4 Montréal	45.5113547	-73.5569227	\N	en_attente	Client: Michel Roy	2026-06-28 01:19:16.726602	2026-06-28 01:19:16.726602
fc1d5dde-86cb-4176-9b5e-3a0636ec53cf	EXO-0701-023	2026-07-01	16:45:00	17:06:00	BERLINE	88 Rue Jules-Choquet J3X2H1 Varennes	\N	\N	1051 Rue Sanguinet H2X3E4 Montréal	\N	\N	\N	en_attente	Client: André Bouchard	2026-06-27 21:37:12.413437	2026-06-27 21:37:12.413437
9e1d7890-0909-49c4-9563-c069be16a5d8	EXO-0701-024	2026-07-01	15:45:00	16:23:00	TAXI	250 Boul de la Marine J3X1G8 Varennes	\N	\N	800 Boul de Maisonneuve H3A0A9 Montréal	\N	\N	\N	en_attente	Client: Chantal Girard | Transport 4 personnes	2026-06-27 21:37:12.417656	2026-06-27 21:37:12.417656
9f19f2b0-4c0b-43d1-bcdf-d74e71e664bf	EXO-0701-025	2026-07-01	07:20:00	08:00:00	VAN	300 Montée de Picardie J3X0B5 Varennes	\N	\N	150 Rue Peel H3C2G8 Montréal	\N	\N	\N	en_attente	Client: Sandra Lavoie | Accompagnateur présent	2026-06-27 21:37:12.421743	2026-06-27 21:37:12.421743
1ed0f8c3-6528-493f-9305-54ecd87cc153	EXO-0702-001	2026-07-02	17:25:00	17:57:00	BERLINE	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	500 Boul René-Lévesque H2Z1A1 Montréal	\N	\N	\N	en_attente	Client: Caroline Tremblay | Retour rendez-vous médical	2026-06-27 21:37:12.491478	2026-06-27 21:37:12.491478
ffe81b16-f333-49c2-a8fe-0c74e9856026	EXO-0702-002	2026-07-02	16:00:00	16:31:00	VAN	410 Rang du Bord-de-l'eau J3X0K2 Varennes	\N	\N	900 Boul St-Joseph J4B5E5 Longueuil	\N	\N	\N	en_attente	Client: André Gagnon	2026-06-27 21:37:12.498054	2026-06-27 21:37:12.498054
99186727-cf9c-47b3-84ab-0841e70b0d5d	EXO-0702-003	2026-07-02	17:20:00	18:08:00	BERLINE	88 Rue Jules-Choquet J3X2H1 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: Daniel Roy | Retour rendez-vous médical	2026-06-27 21:37:12.502481	2026-06-27 21:37:12.502481
b596f0ab-f0db-46b9-b971-d6b16b0ba968	EXO-0702-004	2026-07-02	11:50:00	12:16:00	BERLINE	250 Boul de la Marine J3X1G8 Varennes	\N	\N	500 Boul René-Lévesque H2Z1A1 Montréal	\N	\N	\N	en_attente	Client: Marie Caron | Appeler avant l'arrivée	2026-06-27 21:37:12.50694	2026-06-27 21:37:12.50694
3149de2a-43a3-40ba-8974-df450b2a1a77	EXO-0702-005	2026-07-02	06:55:00	07:19:00	VAN	5 Place du Marché J3X1A9 Varennes	\N	\N	150 Rue Peel H3C2G8 Montréal	\N	\N	\N	en_attente	Client: Isabelle Côté	2026-06-27 21:37:12.510782	2026-06-27 21:37:12.510782
321e1010-922e-4c88-a6c3-ee6a6ab40dc1	EXO-0702-006	2026-07-02	15:05:00	15:34:00	TAXI	15 Rue de la Gare J3X1T9 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: Annie Lefebvre | Client en fauteuil roulant	2026-06-27 21:37:12.514466	2026-06-27 21:37:12.514466
2a044c5f-1139-4e6b-bb04-7ed00c2b17ce	EXO-0702-007	2026-07-02	14:35:00	15:03:00	TAXI	120 Rue Principale J3X1P7 Varennes	\N	\N	800 Boul de Maisonneuve H3A0A9 Montréal	\N	\N	\N	en_attente	Client: Jean Nadeau | Transport 4 personnes	2026-06-27 21:37:12.518785	2026-06-27 21:37:12.518785
72f5a1c0-3a1c-430f-a593-95f09db09978	EXO-0702-008	2026-07-02	13:30:00	14:19:00	BERLINE	5 Place du Marché J3X1A9 Varennes	\N	\N	1000 Rue Sherbrooke H3A1G4 Montréal	\N	\N	\N	en_attente	Client: Caroline Fortin | Accompagnateur présent	2026-06-27 21:37:12.522855	2026-06-27 21:37:12.522855
960b0b42-42f3-405e-9f4c-98789c90c594	EXO-0702-009	2026-07-02	10:15:00	10:38:00	BERLINE	410 Rang du Bord-de-l'eau J3X0K2 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: Mélanie Pelletier | Client en fauteuil roulant	2026-06-27 21:37:12.528334	2026-06-27 21:37:12.528334
a0a7ce1b-2858-4b48-ab46-f58ea75692c6	EXO-0702-010	2026-07-02	12:50:00	13:23:00	BERLINE	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	2200 Rue University H3A2A6 Montréal	\N	\N	\N	en_attente	Client: Nathalie Gauthier | Transport 4 personnes	2026-06-27 21:37:12.532199	2026-06-27 21:37:12.532199
43c7be62-d476-4462-bcec-6831e5b96a32	EXO-0702-011	2026-07-02	15:05:00	15:34:00	BERLINE	120 Rue Principale J3X1P7 Varennes	\N	\N	900 Boul St-Joseph J4B5E5 Longueuil	\N	\N	\N	en_attente	Client: Chantal Lavoie | Client en fauteuil roulant	2026-06-27 21:37:12.535843	2026-06-27 21:37:12.535843
e75163b0-59cb-4d71-9e7f-e04bf4aad8cb	EXO-0702-012	2026-07-02	17:35:00	18:25:00	BERLINE	300 Montée de Picardie J3X0B5 Varennes	\N	\N	1111 Rue St-Charles Ouest J4K5G4 Longueuil	\N	\N	\N	en_attente	Client: François Caron	2026-06-27 21:37:12.540483	2026-06-27 21:37:12.540483
7236b0d1-e6a9-4c70-89c0-8927d1da9090	EXO-0702-013	2026-07-02	10:45:00	11:13:00	TAXI	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: Pierre Beaulieu | Bagages volumineux	2026-06-27 21:37:12.544946	2026-06-27 21:37:12.544946
6962ad33-cf68-4968-bd72-d0877f711521	EXO-0702-014	2026-07-02	13:45:00	14:32:00	BERLINE	78 Chemin du Fleuve J3X1R2 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: Sandra Gauthier	2026-06-27 21:37:12.548583	2026-06-27 21:37:12.548583
50a3372f-0ef6-406d-b040-580d9a64e6de	EXO-0702-015	2026-07-02	18:05:00	18:27:00	VAN	410 Rang du Bord-de-l'eau J3X0K2 Varennes	\N	\N	2200 Rue University H3A2A6 Montréal	\N	\N	\N	en_attente	Client: Chantal Roy | Accompagnateur présent	2026-06-27 21:37:12.553368	2026-06-27 21:37:12.553368
ec377fb2-309d-4a57-8844-f77b46d94a3e	EXO-0702-016	2026-07-02	06:10:00	06:43:00	BERLINE	78 Chemin du Fleuve J3X1R2 Varennes	\N	\N	800 Boul de Maisonneuve H3A0A9 Montréal	\N	\N	\N	en_attente	Client: Pierre Nadeau | Transport 4 personnes	2026-06-27 21:37:12.558717	2026-06-27 21:37:12.558717
329d4647-6b27-42f4-954a-393f8d2f4b93	EXO-0702-017	2026-07-02	06:40:00	07:01:00	BERLINE	120 Rue Principale J3X1P7 Varennes	\N	\N	1051 Rue Sanguinet H2X3E4 Montréal	\N	\N	\N	en_attente	Client: Martin Roy	2026-06-27 21:37:12.564196	2026-06-27 21:37:12.564196
ce966c13-d233-46e9-b1e4-13d7aeefd715	T2026042102	2026-04-21	08:01:00	08:32:00	BERLINE	625 Lechasseur RUE Beloeil J3G 3N1	\N	\N	Hopital Charles-Le Moyne, 3120 Boul. Taschereau Greenfield Park J4V 2H1	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.807951	2026-04-22 22:29:37.807951
3b3a0c4a-7092-46a3-9874-728c192fb780	T2026042103	2026-04-21	08:44:00	09:36:00	TAXI	2100 Boulevard Lapiniere Brossard J4W 2T5	\N	\N	CHUM, 1000 Rue Saint-Denis, Montreal H2X 0C1	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.812263	2026-04-22 22:29:37.812263
9edd5417-8166-445b-8a91-b70bc90b81db	T2026042104	2026-04-21	09:50:00	10:18:00	TAXI	1730 Eiffel RUE Boucherville J4B 7W1	\N	\N	Clinique Rive-Sud, 5320 Cousineau Brossard J4Y 2X2	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.816285	2026-04-22 22:29:37.816285
fce96ceb-87da-46d9-8a2c-41d42555201f	T2026042105	2026-04-21	10:52:00	12:10:00	TAXI	88 Rue des Seigneurs Longueuil J4H 1W2	\N	\N	Polyclinique de Longueuil, 800 Ch. Tiffin Longueuil J4P 3J7	\N	\N	\N	en_attente	Retour à confirmer	2026-04-22 22:29:37.820959	2026-04-22 22:29:37.820959
ec8516e8-60b0-4717-9103-592c50aa8c0b	T2026042106	2026-04-21	12:29:00	13:55:00	TAXI	2000 Chemin du Tremblay Boucherville J4B 6Y1	\N	\N	Hopital Jean-Talon, 1385 Rue Jean-Talon E Montreal H2E 1S6	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.82532	2026-04-22 22:29:37.82532
3b4cee3b-2584-452a-a609-34d69aab84ce	T2026042107	2026-04-21	14:05:00	15:17:00	TAXI	730 Abbe-Theoret AV Sainte-Julie J3E 0E1	\N	\N	Clinique Medicale Sainte-Julie, 585 Rue Saint-Louis Sainte-Julie J3E 2A8	\N	\N	\N	en_attente	Appeler à l'arrivée	2026-04-22 22:29:37.829756	2026-04-22 22:29:37.829756
47998209-c713-46be-be7b-48ad100e3e47	T2026042108	2026-04-21	15:57:00	16:51:00	BERLINE	450 Rue Sherbrooke E Montreal H2L 1J7	\N	\N	Hopital du Sacre-Coeur, 5400 Gouin O Montreal H4J 1C5	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.833979	2026-04-22 22:29:37.833979
5b713552-2603-4062-93e0-70ccaac8f037	T2026042201	2026-04-22	06:19:00	07:01:00	TAXI	980 Rue Sagard Montreal H2C 2X1	\N	\N	CLSC Longueuil-Est, 1905 Rue Alexandre-de-Sève Longueuil J4K 2P8	\N	\N	\N	en_attente	Retour à confirmer	2026-04-22 22:29:37.838406	2026-04-22 22:29:37.838406
241973fd-1703-48cf-aded-1373dfbecb8c	T2026042202	2026-04-22	07:41:00	08:54:00	TAXI	1800 Henri-Blaquiere RUE Chambly J3L 3E9	\N	\N	Clinique Medicale Sainte-Julie, 585 Rue Saint-Louis Sainte-Julie J3E 2A8	\N	\N	\N	en_attente	Patient fragile — conduite prudente	2026-04-22 22:29:37.843816	2026-04-22 22:29:37.843816
7f7237d8-c6db-43cb-bccd-a613b138546a	T2026042203	2026-04-22	09:12:00	10:06:00	TAXI	3355 Autoroute Laval H7T 0H4	\N	\N	Institut de Readaptation Gingras-Lindsay, 6300 Darlington Montreal H3S 2J4	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.848078	2026-04-22 22:29:37.848078
3442cdab-5231-4c1f-a914-f4f8141af8ed	T2026042204	2026-04-22	10:40:00	11:45:00	TAXI	1730 Eiffel RUE Boucherville J4B 7W1	\N	\N	CUSM - Glen, 1001 Decarie Montreal H4A 3J1	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.856701	2026-04-22 22:29:37.856701
9dd9ec5b-1254-4171-ade1-96699e67b913	T2026042205	2026-04-22	11:57:00	12:51:00	TAXI	1800 Henri-Blaquiere RUE Chambly J3L 3E9	\N	\N	Clinique Rive-Sud, 5320 Cousineau Brossard J4Y 2X2	\N	\N	\N	en_attente	Patient fragile — conduite prudente	2026-04-22 22:29:37.863132	2026-04-22 22:29:37.863132
4836d57b-4b65-49d8-ab36-7e8974f412d7	T2026042206	2026-04-22	13:09:00	13:44:00	TAXI	3355 Autoroute Laval H7T 0H4	\N	\N	Polyclinique de Longueuil, 800 Ch. Tiffin Longueuil J4P 3J7	\N	\N	\N	en_attente	Appeler à l'arrivée	2026-04-22 22:29:37.867467	2026-04-22 22:29:37.867467
a1dbe78d-de48-4b95-8d71-f82dd826c4e7	T2026042207	2026-04-22	13:59:00	14:40:00	TAXI	555 Rue Roland-Therrien Longueuil J4H 3V7	\N	\N	Hopital Charles-Le Moyne, 3120 Boul. Taschereau Greenfield Park J4V 2H1	\N	\N	\N	en_attente	Patient fragile — conduite prudente	2026-04-22 22:29:37.873406	2026-04-22 22:29:37.873406
dcc2b8b3-e37d-46c0-9266-667b2524f83c	T2026042208	2026-04-22	15:04:00	16:03:00	TAXI	730 Abbe-Theoret AV Sainte-Julie J3E 0E1	\N	\N	Hopital Anna-Laberge, 200 Boul. Brisebois Chateauguay J6K 4W8	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.880358	2026-04-22 22:29:37.880358
045dc5c6-da86-4d61-82d5-96c540ef4b8c	T2026042301	2026-04-23	06:26:00	07:10:00	TAXI	2505 Rue Ontario E Montreal H2K 1X3	\N	\N	CLSC Longueuil-Est, 1905 Rue Alexandre-de-Sève Longueuil J4K 2P8	\N	\N	\N	en_attente	Appeler à l'arrivée	2026-04-22 22:29:37.885155	2026-04-22 22:29:37.885155
50b25728-8e9c-4682-b6bb-4b0e511e24db	T2026042302	2026-04-23	07:32:00	08:22:00	TAXI	1800 Henri-Blaquiere RUE Chambly J3L 3E9	\N	\N	CUSM - Glen, 1001 Decarie Montreal H4A 3J1	\N	\N	\N	en_attente	Accompagnateur présent	2026-04-22 22:29:37.889407	2026-04-22 22:29:37.889407
f1ee12db-2630-427a-b85a-b884f06dd381	T2026042303	2026-04-23	09:02:00	09:36:00	TAXI	3355 Autoroute Laval H7T 0H4	\N	\N	CLSC Longueuil-Est, 1905 Rue Alexandre-de-Sève Longueuil J4K 2P8	\N	\N	\N	en_attente	Appeler à l'arrivée	2026-04-22 22:29:37.894002	2026-04-22 22:29:37.894002
62d160fc-d79b-4ddb-ae0c-12c27411db42	T2026042304	2026-04-23	10:11:00	10:38:00	TAXI	150 Rue du Boisé Varennes J3X 1N4	\N	\N	Hopital Anna-Laberge, 200 Boul. Brisebois Chateauguay J6K 4W8	\N	\N	\N	en_attente	Retour à confirmer	2026-04-22 22:29:37.898079	2026-04-22 22:29:37.898079
308dc5ef-c222-4331-ba99-075430b69a70	T2026042305	2026-04-23	11:02:00	12:24:00	TAXI	1070 Rue Sanguinet Montreal H2X 3E3	\N	\N	Hopital Maisonneuve-Rosemont, 5415 Boul. Assomption Montreal H1T 2M4	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.902267	2026-04-22 22:29:37.902267
aa567393-cb07-4604-94ff-866c2fb9c895	T2026042401	2026-04-24	06:28:00	07:55:00	TAXI	555 Rue Roland-Therrien Longueuil J4H 3V7	\N	\N	Hopital de Verdun, 4000 Boul. Lasalle Verdun H4G 2A3	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.906434	2026-04-22 22:29:37.906434
4c5dee64-9311-49ac-bae0-f3bbbe3e8b61	T2026042402	2026-04-24	08:21:00	09:11:00	BERLINE	1070 Rue Sanguinet Montreal H2X 3E3	\N	\N	Polyclinique de Longueuil, 800 Ch. Tiffin Longueuil J4P 3J7	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.910711	2026-04-22 22:29:37.910711
43ca1a54-a7ac-431b-a94d-f2bbe59ad765	T2026042403	2026-04-24	09:29:00	10:37:00	TAXI	3355 Autoroute Laval H7T 0H4	\N	\N	CUSM - Glen, 1001 Decarie Montreal H4A 3J1	\N	\N	\N	en_attente	Accès fauteuil roulant	2026-04-22 22:29:37.914754	2026-04-22 22:29:37.914754
66efc578-2920-45e1-8d72-55ff7fb8c3c1	T2026042404	2026-04-24	11:02:00	11:47:00	TAXI	88 Rue des Seigneurs Longueuil J4H 1W2	\N	\N	Institut de Readaptation Gingras-Lindsay, 6300 Darlington Montreal H3S 2J4	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.91909	2026-04-22 22:29:37.91909
2efc73d5-58df-4519-952a-5672920e7377	T2026042405	2026-04-24	12:22:00	13:51:00	TAXI	5515 Saint-Jacques Montreal H4A 3A2	\N	\N	Hopital Maisonneuve-Rosemont, 5415 Boul. Assomption Montreal H1T 2M4	\N	\N	\N	en_attente	Accès fauteuil roulant	2026-04-22 22:29:37.923103	2026-04-22 22:29:37.923103
5d3bcc5d-598f-402a-b4c1-0e1121199f21	T2026042406	2026-04-24	14:03:00	15:19:00	TAXI	980 Rue Sagard Montreal H2C 2X1	\N	\N	Centre Hospitalier Pierre-Boucher, 1333 Montarville Longueuil J4M 2A5	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.927132	2026-04-22 22:29:37.927132
66465947-7a5f-44d0-9b68-ca3ec90b6815	T2026042407	2026-04-24	15:43:00	17:10:00	TAXI	450 Rue Sherbrooke E Montreal H2L 1J7	\N	\N	Hopital Maisonneuve-Rosemont, 5415 Boul. Assomption Montreal H1T 2M4	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.930771	2026-04-22 22:29:37.930771
f9fb60c8-c116-42ec-9709-0f586390cab0	T2026042408	2026-04-24	17:25:00	17:52:00	TAXI	1730 Eiffel RUE Boucherville J4B 7W1	\N	\N	Centre Hospitalier Pierre-Boucher, 1333 Montarville Longueuil J4M 2A5	\N	\N	\N	en_attente	Accès fauteuil roulant	2026-04-22 22:29:37.936045	2026-04-22 22:29:37.936045
e65cffd0-c246-49b8-8250-5950bcdc37b0	T2026042501	2026-04-25	06:33:00	07:35:00	BERLINE	61 De Montbrun RUE Boucherville J4B 5T3	\N	\N	Hopital Santa Cabrini, 5655 Rue Saint-Zotique E Montreal H1T 1P7	\N	\N	\N	en_attente	Accompagnateur présent	2026-04-22 22:29:37.940325	2026-04-22 22:29:37.940325
03fb82bc-3aa8-4314-820f-bbf4a6ecf1d0	T2026042502	2026-04-25	08:09:00	09:02:00	TAXI	3355 Autoroute Laval H7T 0H4	\N	\N	Hopital Santa Cabrini, 5655 Rue Saint-Zotique E Montreal H1T 1P7	\N	\N	\N	en_attente	Accompagnateur présent	2026-04-22 22:29:37.944495	2026-04-22 22:29:37.944495
860f2a3c-014d-415d-af46-2619a650e378	T2026042503	2026-04-25	09:27:00	10:19:00	TAXI	2505 Rue Ontario E Montreal H2K 1X3	\N	\N	Clinique Medicale Sainte-Julie, 585 Rue Saint-Louis Sainte-Julie J3E 2A8	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.950225	2026-04-22 22:29:37.950225
63899cc7-4720-4240-97af-5b8015b1ab2d	T2026042601	2026-04-26	06:29:00	07:02:00	BERLINE	2505 Rue Ontario E Montreal H2K 1X3	\N	\N	Hopital Charles-Le Moyne, 3120 Boul. Taschereau Greenfield Park J4V 2H1	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.956271	2026-04-22 22:29:37.956271
b03daa74-e0ed-406e-8ff3-23458e91b99f	T2026042602	2026-04-26	07:32:00	08:25:00	BERLINE	555 Rue Roland-Therrien Longueuil J4H 3V7	\N	\N	Institut de Readaptation Gingras-Lindsay, 6300 Darlington Montreal H3S 2J4	\N	\N	\N	en_attente	Patient fragile — conduite prudente	2026-04-22 22:29:37.96126	2026-04-22 22:29:37.96126
7d8671d4-2456-4f56-8173-98c83704aa15	T2026042701	2026-04-27	06:24:00	07:22:00	TAXI	1000 Saint-Denis RUE Montreal H2X 0C1	\N	\N	Centre Hospitalier Pierre-Boucher, 1333 Montarville Longueuil J4M 2A5	\N	\N	\N	en_attente	Appeler à l'arrivée	2026-04-22 22:29:37.967216	2026-04-22 22:29:37.967216
6ff850e3-fc7b-4600-bec8-c2c75ea7e038	T2026042702	2026-04-27	07:43:00	08:08:00	BERLINE	88 Rue des Seigneurs Longueuil J4H 1W2	\N	\N	CHUM, 1000 Rue Saint-Denis, Montreal H2X 0C1	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.972044	2026-04-22 22:29:37.972044
45f40219-de89-4ba8-801e-d89a5d34f9a9	T2026042703	2026-04-27	08:27:00	09:08:00	TAXI	227 du Golf RUE Mont-Saint-Hilaire J3H 5Z8	\N	\N	Clinique Rive-Sud, 5320 Cousineau Brossard J4Y 2X2	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.976198	2026-04-22 22:29:37.976198
4cdd454d-cbab-4fe5-a319-05a25a652eb4	T2026042704	2026-04-27	09:33:00	10:25:00	TAXI	5515 Saint-Jacques Montreal H4A 3A2	\N	\N	Hopital de Verdun, 4000 Boul. Lasalle Verdun H4G 2A3	\N	\N	\N	en_attente	Appeler à l'arrivée	2026-04-22 22:29:37.980433	2026-04-22 22:29:37.980433
c55363f5-9389-4336-9fd9-233bca67976c	T2026042705	2026-04-27	10:52:00	11:45:00	TAXI	227 du Golf RUE Mont-Saint-Hilaire J3H 5Z8	\N	\N	Institut de Readaptation Gingras-Lindsay, 6300 Darlington Montreal H3S 2J4	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.985337	2026-04-22 22:29:37.985337
b27a8fa8-e42b-4c34-bc23-dfaaa81befda	T2026042706	2026-04-27	12:07:00	13:40:00	BERLINE	1070 Rue Sanguinet Montreal H2X 3E3	\N	\N	CLSC Longueuil-Est, 1905 Rue Alexandre-de-Sève Longueuil J4K 2P8	\N	\N	\N	en_attente	Patient fragile — conduite prudente	2026-04-22 22:29:37.99007	2026-04-22 22:29:37.99007
4510a12d-e8fd-458b-9ca7-b0c25100bfb2	T2026042707	2026-04-27	14:00:00	14:52:00	TAXI	450 Rue Sherbrooke E Montreal H2L 1J7	\N	\N	Hopital Anna-Laberge, 200 Boul. Brisebois Chateauguay J6K 4W8	\N	\N	\N	en_attente	Accompagnateur présent	2026-04-22 22:29:37.995287	2026-04-22 22:29:37.995287
6797b57a-29ca-4cbe-b126-1406dd6ba171	T2026042708	2026-04-27	15:06:00	15:42:00	BERLINE	2000 Chemin du Tremblay Boucherville J4B 6Y1	\N	\N	CLSC Longueuil-Est, 1905 Rue Alexandre-de-Sève Longueuil J4K 2P8	\N	\N	\N	en_attente	\N	2026-04-22 22:29:37.999727	2026-04-22 22:29:37.999727
ba93b1cf-f41b-4d1f-8b08-110bbd95f132	T2026042801	2026-04-28	06:15:00	07:09:00	TAXI	1800 Henri-Blaquiere RUE Chambly J3L 3E9	\N	\N	Hopital Charles-Le Moyne, 3120 Boul. Taschereau Greenfield Park J4V 2H1	\N	\N	\N	en_attente	\N	2026-04-22 22:29:38.004577	2026-04-22 22:29:38.004577
06c5ac04-51a3-4b3e-84e3-5e914e20de28	T2026042802	2026-04-28	07:45:00	08:57:00	TAXI	2100 Boulevard Lapiniere Brossard J4W 2T5	\N	\N	Clinique Medicale Sainte-Julie, 585 Rue Saint-Louis Sainte-Julie J3E 2A8	\N	\N	\N	en_attente	\N	2026-04-22 22:29:38.012059	2026-04-22 22:29:38.012059
71affbe3-e4c9-4c83-9d13-df610f6853b5	T2026042803	2026-04-28	09:14:00	10:30:00	BERLINE	980 Rue Sagard Montreal H2C 2X1	\N	\N	Clinique Medicale Sainte-Julie, 585 Rue Saint-Louis Sainte-Julie J3E 2A8	\N	\N	\N	en_attente	Retour à confirmer	2026-04-22 22:29:38.016584	2026-04-22 22:29:38.016584
5b0cbea1-3d31-4ba2-9a88-4c26e01d37f1	T2026042804	2026-04-28	11:09:00	11:59:00	TAXI	61 De Montbrun RUE Boucherville J4B 5T3	\N	\N	Hopital de Verdun, 4000 Boul. Lasalle Verdun H4G 2A3	\N	\N	\N	en_attente	\N	2026-04-22 22:29:38.021581	2026-04-22 22:29:38.021581
36386b40-b86b-41cc-8401-07dddc6f5062	T2026042805	2026-04-28	12:09:00	13:15:00	TAXI	980 Rue Sagard Montreal H2C 2X1	\N	\N	Hopital Charles-Le Moyne, 3120 Boul. Taschereau Greenfield Park J4V 2H1	\N	\N	\N	en_attente	\N	2026-04-22 22:29:38.027163	2026-04-22 22:29:38.027163
87d32712-485d-4427-853c-15ca63cb530a	T2026042901	2026-04-29	06:26:00	07:42:00	TAXI	5515 Saint-Jacques Montreal H4A 3A2	\N	\N	CHUM, 1000 Rue Saint-Denis, Montreal H2X 0C1	\N	\N	\N	en_attente	Appeler à l'arrivée	2026-04-22 22:29:38.032247	2026-04-22 22:29:38.032247
d7da9760-41a4-4756-8471-45e2cb16138f	T2026042902	2026-04-29	07:57:00	09:20:00	TAXI	61 De Montbrun RUE Boucherville J4B 5T3	\N	\N	CHUM, 1000 Rue Saint-Denis, Montreal H2X 0C1	\N	\N	\N	en_attente	\N	2026-04-22 22:29:38.036762	2026-04-22 22:29:38.036762
b7e71241-d3bf-486e-a5a6-7f6dce4b42d2	T2026042903	2026-04-29	09:57:00	10:46:00	TAXI	730 Abbe-Theoret AV Sainte-Julie J3E 0E1	\N	\N	CHUM, 1000 Rue Saint-Denis, Montreal H2X 0C1	\N	\N	\N	en_attente	\N	2026-04-22 22:29:38.04199	2026-04-22 22:29:38.04199
c34a0e64-0ae5-41ac-94e5-9b7582871eee	T2026042904	2026-04-29	10:57:00	11:28:00	TAXI	730 Abbe-Theoret AV Sainte-Julie J3E 0E1	\N	\N	Hopital Maisonneuve-Rosemont, 5415 Boul. Assomption Montreal H1T 2M4	\N	\N	\N	en_attente	\N	2026-04-22 22:29:38.048357	2026-04-22 22:29:38.048357
d391ed0f-c83d-4fee-b172-8c71b3f40fc9	T2026042905	2026-04-29	11:51:00	13:09:00	TAXI	88 Rue des Seigneurs Longueuil J4H 1W2	\N	\N	Clinique Medicale Sainte-Julie, 585 Rue Saint-Louis Sainte-Julie J3E 2A8	\N	\N	\N	en_attente	\N	2026-04-22 22:29:38.055255	2026-04-22 22:29:38.055255
7e82e814-41e2-42c9-9ce0-262e561ecf8d	T2026042906	2026-04-29	13:26:00	14:06:00	TAXI	555 Rue Roland-Therrien Longueuil J4H 3V7	\N	\N	Hopital de Verdun, 4000 Boul. Lasalle Verdun H4G 2A3	\N	\N	\N	en_attente	Retour à confirmer	2026-04-22 22:29:38.059863	2026-04-22 22:29:38.059863
071a840e-35f4-4a96-ad7e-6bb7375d4783	T2026042907	2026-04-29	14:32:00	15:22:00	TAXI	2505 Rue Ontario E Montreal H2K 1X3	\N	\N	CHUM, 1000 Rue Saint-Denis, Montreal H2X 0C1	\N	\N	\N	en_attente	Retour à confirmer	2026-04-22 22:29:38.065307	2026-04-22 22:29:38.065307
21008a18-906f-4873-8f44-e6f47c8f4fe8	T2026042908	2026-04-29	16:00:00	17:29:00	TAXI	450 Rue Sherbrooke E Montreal H2L 1J7	\N	\N	Polyclinique de Longueuil, 800 Ch. Tiffin Longueuil J4P 3J7	\N	\N	\N	en_attente	\N	2026-04-22 22:29:38.070517	2026-04-22 22:29:38.070517
378a1cc3-0db3-4d42-8c42-50c8b8abcf3e	T2026042909	2026-04-29	18:04:00	18:45:00	TAXI	980 Rue Sagard Montreal H2C 2X1	\N	\N	Hopital de Verdun, 4000 Boul. Lasalle Verdun H4G 2A3	\N	\N	\N	en_attente	\N	2026-04-22 22:29:38.079378	2026-04-22 22:29:38.079378
b6da0d55-58e1-42d0-94f3-8a2806f4d1c6	T2026043001	2026-04-30	06:16:00	06:49:00	TAXI	625 Lechasseur RUE Beloeil J3G 3N1	\N	\N	Hopital Jean-Talon, 1385 Rue Jean-Talon E Montreal H2E 1S6	\N	\N	\N	en_attente	\N	2026-04-22 22:29:38.083972	2026-04-22 22:29:38.083972
5579b457-6d28-47f4-93ce-75451ce3c9e8	T2026043002	2026-04-30	07:05:00	08:09:00	TAXI	150 Rue du Boisé Varennes J3X 1N4	\N	\N	CLSC Longueuil-Est, 1905 Rue Alexandre-de-Sève Longueuil J4K 2P8	\N	\N	\N	en_attente	\N	2026-04-22 22:29:38.088262	2026-04-22 22:29:38.088262
f038c8a3-9752-45a4-adc8-ee356b0afb5a	T2026043003	2026-04-30	08:21:00	09:18:00	BERLINE	555 Rue Roland-Therrien Longueuil J4H 3V7	\N	\N	Hopital de Verdun, 4000 Boul. Lasalle Verdun H4G 2A3	\N	\N	\N	en_attente	Accompagnateur présent	2026-04-22 22:29:38.093718	2026-04-22 22:29:38.093718
33f26c8d-41a8-487c-808b-75eab54fac26	T2026043004	2026-04-30	09:40:00	10:52:00	TAXI	1070 Rue Sanguinet Montreal H2X 3E3	\N	\N	CHUM, 1000 Rue Saint-Denis, Montreal H2X 0C1	\N	\N	\N	en_attente	Accompagnateur présent	2026-04-22 22:29:38.102135	2026-04-22 22:29:38.102135
6b984c06-45e8-4c34-85a6-88507bbea9ec	T2026043005	2026-04-30	11:18:00	12:47:00	BERLINE	3400 de Maisonneuve O Montreal H3Z 3B8	\N	\N	Hopital Maisonneuve-Rosemont, 5415 Boul. Assomption Montreal H1T 2M4	\N	\N	\N	en_attente	\N	2026-04-22 22:29:38.106771	2026-04-22 22:29:38.106771
bbdb791c-4c86-4489-9871-883eedbc998d	T2026043006	2026-04-30	12:57:00	14:07:00	TAXI	1070 Rue Sanguinet Montreal H2X 3E3	\N	\N	Hopital Charles-Le Moyne, 3120 Boul. Taschereau Greenfield Park J4V 2H1	\N	\N	\N	en_attente	Accompagnateur présent	2026-04-22 22:29:38.111624	2026-04-22 22:29:38.111624
5b738f52-caa5-4b6c-88ae-465d0bd22a1e	T2026043007	2026-04-30	14:32:00	15:46:00	TAXI	61 De Montbrun RUE Boucherville J4B 5T3	\N	\N	Clinique Rive-Sud, 5320 Cousineau Brossard J4Y 2X2	\N	\N	\N	en_attente	Accès fauteuil roulant	2026-04-22 22:29:38.116383	2026-04-22 22:29:38.116383
56356d99-5189-4fc5-b148-5cd11f476285	T2026043008	2026-04-30	16:26:00	17:59:00	BERLINE	730 Abbe-Theoret AV Sainte-Julie J3E 0E1	\N	\N	Clinique Rive-Sud, 5320 Cousineau Brossard J4Y 2X2	\N	\N	\N	en_attente	\N	2026-04-22 22:29:38.121678	2026-04-22 22:29:38.121678
f5045216-e5ad-42f9-918b-eea0de384ed5	EXO-0630-001	2026-06-30	15:10:00	15:30:00	TAXI	15 Rue de la Gare J3X1T9 Varennes	\N	\N	5400 Boul Gouin Ouest H4J1C5 Montréal	\N	\N	\N	en_attente	Client: Sylvain Côté	2026-06-27 21:36:50.552224	2026-06-27 21:36:50.552224
d741e02a-c8b3-41f0-8be5-6ff03a4807ec	EXO-0630-002	2026-06-30	16:00:00	16:31:00	TAXI	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	800 Boul de Maisonneuve H3A0A9 Montréal	\N	\N	\N	en_attente	Client: Nathalie Fournier	2026-06-27 21:36:50.626493	2026-06-27 21:36:50.626493
f8c32f16-76d9-4cd9-87a2-7f1db0617665	EXO-0630-003	2026-06-30	06:30:00	07:14:00	TAXI	5 Place du Marché J3X1A9 Varennes	\N	\N	5400 Boul Gouin Ouest H4J1C5 Montréal	\N	\N	\N	en_attente	Client: Isabelle Girard	2026-06-27 21:36:50.631364	2026-06-27 21:36:50.631364
e4526993-23ff-4904-8b64-3cd8a7974b10	EXO-0630-004	2026-06-30	15:15:00	15:45:00	BERLINE	78 Chemin du Fleuve J3X1R2 Varennes	\N	\N	1111 Rue St-Charles Ouest J4K5G4 Longueuil	\N	\N	\N	en_attente	Client: Marc Poirier | Bagages volumineux	2026-06-27 21:36:50.63697	2026-06-27 21:36:50.63697
ff632743-8e98-4a62-a989-f03993a4285c	EXO-0630-005	2026-06-30	18:10:00	18:38:00	VAN	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	2200 Rue University H3A2A6 Montréal	\N	\N	\N	en_attente	Client: Caroline Simard | Accompagnateur présent	2026-06-27 21:36:50.641881	2026-06-27 21:36:50.641881
f6ddc057-2fff-4759-bb42-d3a591c8201f	EXO-0630-006	2026-06-30	17:20:00	18:01:00	TAXI	300 Montée de Picardie J3X0B5 Varennes	\N	\N	900 Boul St-Joseph J4B5E5 Longueuil	\N	\N	\N	en_attente	Client: Stéphane Ouellet	2026-06-27 21:36:50.64738	2026-06-27 21:36:50.64738
f11be13f-a64c-496c-bd08-5b20c1fc4f28	EXO-0630-007	2026-06-30	09:15:00	09:44:00	BERLINE	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	150 Rue Peel H3C2G8 Montréal	\N	\N	\N	en_attente	Client: Daniel Beaulieu | Accompagnateur présent	2026-06-27 21:36:50.651577	2026-06-27 21:36:50.651577
6c981487-240c-49c8-b2fd-04e8583fd9d0	EXO-0630-008	2026-06-30	06:00:00	06:21:00	BERLINE	78 Chemin du Fleuve J3X1R2 Varennes	\N	\N	2200 Rue University H3A2A6 Montréal	\N	\N	\N	en_attente	Client: Martin Bergeron	2026-06-27 21:36:50.656328	2026-06-27 21:36:50.656328
2e08705d-db0b-4b0b-b6d6-87e8814009ac	EXO-0630-009	2026-06-30	14:50:00	15:22:00	BERLINE	410 Rang du Bord-de-l'eau J3X0K2 Varennes	\N	\N	1111 Rue St-Charles Ouest J4K5G4 Longueuil	\N	\N	\N	en_attente	Client: Pierre Roy	2026-06-27 21:36:50.679651	2026-06-27 21:36:50.679651
37c1dd28-ea9e-4e46-8b1d-524f2fb60615	EXO-0630-010	2026-06-30	08:10:00	08:58:00	BERLINE	300 Montée de Picardie J3X0B5 Varennes	\N	\N	1051 Rue Sanguinet H2X3E4 Montréal	\N	\N	\N	en_attente	Client: Robert Roy | Accompagnateur présent	2026-06-27 21:36:50.684119	2026-06-27 21:36:50.684119
6a5cf3b8-ab11-4f0e-aa49-9f8e3ee25283	EXO-0630-011	2026-06-30	08:05:00	08:41:00	TAXI	45 Avenue des Pins J3X2K4 Varennes	\N	\N	5400 Boul Gouin Ouest H4J1C5 Montréal	\N	\N	\N	en_attente	Client: Marie Pelletier | Retour rendez-vous médical	2026-06-27 21:36:50.688115	2026-06-27 21:36:50.688115
d327cd17-4df5-4389-95cd-00534df33240	EXO-0630-012	2026-06-30	07:55:00	08:15:00	BERLINE	88 Rue Jules-Choquet J3X2H1 Varennes	\N	\N	1000 Rue Sherbrooke H3A1G4 Montréal	\N	\N	\N	en_attente	Client: Caroline Cloutier | Accompagnateur présent	2026-06-27 21:36:50.693016	2026-06-27 21:36:50.693016
8bc66254-b573-45e4-b509-28de95c17b79	EXO-0630-013	2026-06-30	09:30:00	09:58:00	VAN	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: Annie Bouchard | Client en fauteuil roulant	2026-06-27 21:36:50.697605	2026-06-27 21:36:50.697605
b3244299-831a-4577-a424-fd44b786642c	EXO-0630-014	2026-06-30	08:00:00	08:28:00	BERLINE	78 Chemin du Fleuve J3X1R2 Varennes	\N	\N	1000 Rue Sherbrooke H3A1G4 Montréal	\N	\N	\N	en_attente	Client: Sophie Morin | Bagages volumineux	2026-06-27 21:36:50.701987	2026-06-27 21:36:50.701987
887c49e6-525d-476b-854a-c0d0ad6807d0	EXO-0703-011	2026-07-03	06:20:00	07:04:00	TAXI	88 Rue Jules-Choquet J3X2H1 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: Marc Caron | Transport 4 personnes	2026-06-27 21:37:12.748093	2026-06-27 21:37:12.748093
1045da4f-ed36-4eae-aaeb-274c1a41f345	EXO-0703-012	2026-07-03	15:20:00	16:06:00	BERLINE	300 Montée de Picardie J3X0B5 Varennes	\N	\N	900 Boul St-Joseph J4B5E5 Longueuil	\N	\N	\N	en_attente	Client: Nathalie Lavoie | Retour rendez-vous médical	2026-06-27 21:37:12.776813	2026-06-27 21:37:12.776813
647f1b88-034a-475d-a0a7-5914fb429a48	EXO-0703-013	2026-07-03	14:30:00	14:52:00	TAXI	250 Boul de la Marine J3X1G8 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: Julie Dubé	2026-06-27 21:37:12.78223	2026-06-27 21:37:12.78223
ba3d2cec-932c-49e5-997b-2f7d9a365b58	EXO-0703-014	2026-07-03	11:25:00	12:12:00	VAN	300 Montée de Picardie J3X0B5 Varennes	\N	\N	1000 Rue Sherbrooke H3A1G4 Montréal	\N	\N	\N	en_attente	Client: Martin Simard | Client en fauteuil roulant	2026-06-27 21:37:12.789056	2026-06-27 21:37:12.789056
e7ce3c65-b9aa-49cf-b5bc-ee045553edaf	EXO-0703-015	2026-07-03	18:55:00	19:17:00	TAXI	5 Place du Marché J3X1A9 Varennes	\N	\N	800 Boul de Maisonneuve H3A0A9 Montréal	\N	\N	\N	en_attente	Client: Luc Roy | Retour rendez-vous médical	2026-06-27 21:37:12.792832	2026-06-27 21:37:12.792832
5aadd794-5e5c-46c5-8283-e036d3d54a4b	EXO-0703-016	2026-07-03	18:20:00	18:56:00	BERLINE	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	1111 Rue St-Charles Ouest J4K5G4 Longueuil	\N	\N	\N	en_attente	Client: Julie Cloutier	2026-06-27 21:37:12.796638	2026-06-27 21:37:12.796638
4279fde8-d765-422b-bdb3-86846fb219d3	EXO-0703-017	2026-07-03	17:55:00	18:21:00	TAXI	5 Place du Marché J3X1A9 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: Martin Lavoie	2026-06-27 21:37:12.800379	2026-06-27 21:37:12.800379
8ec2e7d4-d7d9-447a-b3f4-31ce5ede5fe1	EXO-0703-018	2026-07-03	12:25:00	13:12:00	BERLINE	410 Rang du Bord-de-l'eau J3X0K2 Varennes	\N	\N	900 Boul St-Joseph J4B5E5 Longueuil	\N	\N	\N	en_attente	Client: André Lévesque	2026-06-27 21:37:12.820542	2026-06-27 21:37:12.820542
3c33373e-ff81-44a9-a408-46c2f6caa124	EXO-0703-019	2026-07-03	13:10:00	14:00:00	VAN	300 Montée de Picardie J3X0B5 Varennes	\N	\N	5400 Boul Gouin Ouest H4J1C5 Montréal	\N	\N	\N	en_attente	Client: Jean Pelletier | Client en fauteuil roulant	2026-06-27 21:37:12.82483	2026-06-27 21:37:12.82483
c9dc0b78-1092-4a4e-998b-0b2df7bcda1a	EXO-0703-020	2026-07-03	18:15:00	18:50:00	TAXI	15 Rue de la Gare J3X1T9 Varennes	\N	\N	5400 Boul Gouin Ouest H4J1C5 Montréal	\N	\N	\N	en_attente	Client: Sylvain Morin | Retour rendez-vous médical	2026-06-27 21:37:12.830298	2026-06-27 21:37:12.830298
9d9ab4b9-3d22-4b7a-aa50-328042294f1a	EXO-0703-021	2026-07-03	09:40:00	10:27:00	TAXI	250 Boul de la Marine J3X1G8 Varennes	\N	\N	500 Boul René-Lévesque H2Z1A1 Montréal	\N	\N	\N	en_attente	Client: Caroline Beaulieu | Bagages volumineux	2026-06-27 21:37:12.833859	2026-06-27 21:37:12.833859
0e767e81-cb25-4b1d-857d-be936074e8ca	EXO-0703-022	2026-07-03	17:20:00	17:40:00	TAXI	88 Rue Jules-Choquet J3X2H1 Varennes	\N	\N	2200 Rue University H3A2A6 Montréal	\N	\N	\N	en_attente	Client: Josée Morin | Appeler avant l'arrivée	2026-06-27 21:37:12.839434	2026-06-27 21:37:12.839434
4ba12034-1dcd-40f5-8822-ba802aa4ac00	EXO-0703-023	2026-07-03	14:05:00	14:34:00	VAN	250 Boul de la Marine J3X1G8 Varennes	\N	\N	150 Rue Peel H3C2G8 Montréal	\N	\N	\N	en_attente	Client: François Poirier	2026-06-27 21:37:12.869666	2026-06-27 21:37:12.869666
328883e1-f3f3-4661-badd-bb8cfacfafe5	EXO-0703-024	2026-07-03	14:10:00	14:48:00	BERLINE	410 Rang du Bord-de-l'eau J3X0K2 Varennes	\N	\N	1000 Rue Sherbrooke H3A1G4 Montréal	\N	\N	\N	en_attente	Client: Martin Lévesque | Appeler avant l'arrivée	2026-06-27 21:37:12.874759	2026-06-27 21:37:12.874759
770478a4-e772-466e-aab2-a01b96953e11	EXO-0704-001	2026-07-04	14:55:00	15:23:00	TAXI	300 Montée de Picardie J3X0B5 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: Sylvain Fortin	2026-06-27 21:37:12.948422	2026-06-27 21:37:12.948422
9984a4b8-176c-44b6-be0b-740e0323fc77	EXO-0704-002	2026-07-04	17:25:00	18:00:00	VAN	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	150 Rue Peel H3C2G8 Montréal	\N	\N	\N	en_attente	Client: Robert Bouchard | Client en fauteuil roulant	2026-06-27 21:37:12.954255	2026-06-27 21:37:12.954255
f816e787-16e3-4aa4-b5f4-ba961929dcaa	EXO-0704-003	2026-07-04	15:55:00	16:37:00	BERLINE	15 Rue de la Gare J3X1T9 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: Geneviève Simard | Accompagnateur présent	2026-06-27 21:37:12.95992	2026-06-27 21:37:12.95992
193bce79-17ae-4d15-b195-d5819cd7dd25	EXO-0704-004	2026-07-04	18:00:00	18:22:00	TAXI	5 Place du Marché J3X1A9 Varennes	\N	\N	2200 Rue University H3A2A6 Montréal	\N	\N	\N	en_attente	Client: Jean Caron | Client en fauteuil roulant	2026-06-27 21:37:12.963925	2026-06-27 21:37:12.963925
79cf788d-832e-4efd-9904-5850cc12f2f7	EXO-0704-005	2026-07-04	10:30:00	10:55:00	TAXI	250 Boul de la Marine J3X1G8 Varennes	\N	\N	500 Boul René-Lévesque H2Z1A1 Montréal	\N	\N	\N	en_attente	Client: Nathalie Côté | Transport 4 personnes	2026-06-27 21:37:12.967806	2026-06-27 21:37:12.967806
70fba728-ed16-4d7b-8326-401a5a2572ce	EXO-0704-006	2026-07-04	15:25:00	16:06:00	BERLINE	250 Boul de la Marine J3X1G8 Varennes	\N	\N	150 Rue Peel H3C2G8 Montréal	\N	\N	\N	en_attente	Client: Geneviève Simard | Retour rendez-vous médical	2026-06-27 21:37:12.973493	2026-06-27 21:37:12.973493
c3eedc14-480f-4403-acf1-0cc8c7a6bc0b	EXO-0704-007	2026-07-04	16:15:00	16:55:00	TAXI	300 Montée de Picardie J3X0B5 Varennes	\N	\N	1051 Rue Sanguinet H2X3E4 Montréal	\N	\N	\N	en_attente	Client: Émilie Bergeron	2026-06-27 21:37:12.979073	2026-06-27 21:37:12.979073
b2c54bba-d91e-4e2a-ab6d-3968ed535d1b	EXO-0704-008	2026-07-04	14:55:00	15:39:00	TAXI	15 Rue de la Gare J3X1T9 Varennes	\N	\N	800 Boul de Maisonneuve H3A0A9 Montréal	\N	\N	\N	en_attente	Client: Robert Dubé	2026-06-27 21:37:12.983631	2026-06-27 21:37:12.983631
6877c550-af3b-47d5-a9fd-ef0131448665	EXO-0704-009	2026-07-04	10:25:00	10:54:00	TAXI	15 Rue de la Gare J3X1T9 Varennes	\N	\N	900 Boul St-Joseph J4B5E5 Longueuil	\N	\N	\N	en_attente	Client: Stéphane Dubé | Bagages volumineux	2026-06-27 21:37:12.989062	2026-06-27 21:37:12.989062
3fab0b30-b704-49be-996c-e4c7fdc1297b	EXO-0704-010	2026-07-04	13:35:00	14:11:00	VAN	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	5400 Boul Gouin Ouest H4J1C5 Montréal	\N	\N	\N	en_attente	Client: Pierre Tremblay | Transport 4 personnes	2026-06-27 21:37:12.99806	2026-06-27 21:37:12.99806
89542734-b75b-4244-8f09-81ce59a63bfc	EXO-0704-011	2026-07-04	14:40:00	15:02:00	BERLINE	120 Rue Principale J3X1P7 Varennes	\N	\N	800 Boul de Maisonneuve H3A0A9 Montréal	\N	\N	\N	en_attente	Client: Sandra Pelletier	2026-06-27 21:37:13.002072	2026-06-27 21:37:13.002072
e2aedb6b-c797-46ed-8f3c-05fba6797840	EXO-0704-012	2026-07-04	14:10:00	14:57:00	BERLINE	300 Montée de Picardie J3X0B5 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: Daniel Boucher	2026-06-27 21:37:13.005853	2026-06-27 21:37:13.005853
80d61cbe-19d9-44e9-981f-7e63df0a783a	EXO-0704-013	2026-07-04	15:55:00	16:40:00	BERLINE	300 Montée de Picardie J3X0B5 Varennes	\N	\N	5400 Boul Gouin Ouest H4J1C5 Montréal	\N	\N	\N	en_attente	Client: Sylvain Bergeron | Client en fauteuil roulant	2026-06-27 21:37:13.009731	2026-06-27 21:37:13.009731
bb326ad6-e5df-4396-82f2-dd7896924407	EXO-0704-014	2026-07-04	06:55:00	07:39:00	BERLINE	300 Montée de Picardie J3X0B5 Varennes	\N	\N	3175 Chemin de la Côte-Sainte-Catherine H3T1C5 Montréal	\N	\N	\N	en_attente	Client: Michel Dubé	2026-06-27 21:37:13.013702	2026-06-27 21:37:13.013702
734ec177-0f17-4774-bd0f-e41e3a8f2077	EXO-0704-015	2026-07-04	16:55:00	17:39:00	TAXI	300 Montée de Picardie J3X0B5 Varennes	\N	\N	150 Rue Peel H3C2G8 Montréal	\N	\N	\N	en_attente	Client: André Poirier | Retour rendez-vous médical	2026-06-27 21:37:13.017699	2026-06-27 21:37:13.017699
ab8a920d-2a63-418b-8729-5c639df65983	EXO-0704-016	2026-07-04	14:50:00	15:38:00	TAXI	45 Avenue des Pins J3X2K4 Varennes	\N	\N	1111 Rue St-Charles Ouest J4K5G4 Longueuil	\N	\N	\N	en_attente	Client: André Côté | Retour rendez-vous médical	2026-06-27 21:37:13.022146	2026-06-27 21:37:13.022146
a66310a6-c19f-4933-8dbc-672db660c706	EXO-0704-017	2026-07-04	07:35:00	08:00:00	BERLINE	300 Montée de Picardie J3X0B5 Varennes	\N	\N	800 Boul de Maisonneuve H3A0A9 Montréal	\N	\N	\N	en_attente	Client: Michel Poirier	2026-06-27 21:37:13.030329	2026-06-27 21:37:13.030329
d080d6cc-6cc5-4df6-8b13-a7909547eeef	EXO-0704-018	2026-07-04	07:20:00	07:50:00	TAXI	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	1000 Rue Sherbrooke H3A1G4 Montréal	\N	\N	\N	en_attente	Client: Sylvain Fortin | Appeler avant l'arrivée	2026-06-27 21:37:13.040975	2026-06-27 21:37:13.040975
19b85b1f-702c-4ed9-9ca3-1153651d361c	EXO-0704-019	2026-07-04	06:30:00	07:05:00	TAXI	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	2200 Rue University H3A2A6 Montréal	\N	\N	\N	en_attente	Client: Émilie Boucher | Transport 4 personnes	2026-06-27 21:37:13.184495	2026-06-27 21:37:13.184495
ad4cc39b-d93e-4fe6-a89b-f59c3697468d	EXO-0704-020	2026-07-04	09:20:00	10:06:00	BERLINE	410 Rang du Bord-de-l'eau J3X0K2 Varennes	\N	\N	1000 Rue Sherbrooke H3A1G4 Montréal	\N	\N	\N	en_attente	Client: Mélanie Fortin | Transport 4 personnes	2026-06-27 21:37:13.218648	2026-06-27 21:37:13.218648
0e8d9298-7c64-46b0-97f0-e7c713cd7d14	EXO-0704-021	2026-07-04	18:15:00	18:36:00	VAN	45 Avenue des Pins J3X2K4 Varennes	\N	\N	5400 Boul Gouin Ouest H4J1C5 Montréal	\N	\N	\N	en_attente	Client: Mélanie Boucher | Transport 4 personnes	2026-06-27 21:37:13.223287	2026-06-27 21:37:13.223287
38c0b339-9544-4cb0-b520-3cff575b6e29	EXO-0704-022	2026-07-04	09:45:00	10:13:00	VAN	300 Montée de Picardie J3X0B5 Varennes	\N	\N	1111 Rue St-Charles Ouest J4K5G4 Longueuil	\N	\N	\N	en_attente	Client: Michel Lévesque | Retour rendez-vous médical	2026-06-27 21:37:13.227101	2026-06-27 21:37:13.227101
910f1bd4-cdbd-4f59-9449-3fa1f2d461f1	EXO-0704-023	2026-07-04	06:20:00	06:54:00	VAN	15 Rue de la Gare J3X1T9 Varennes	\N	\N	150 Rue Peel H3C2G8 Montréal	\N	\N	\N	en_attente	Client: Michel Roy | Accompagnateur présent	2026-06-27 21:37:13.231762	2026-06-27 21:37:13.231762
bb212337-e901-42fa-a156-91bc165c9abc	EXO-0705-001	2026-07-05	14:30:00	15:09:00	VAN	300 Montée de Picardie J3X0B5 Varennes	\N	\N	2200 Rue University H3A2A6 Montréal	\N	\N	\N	en_attente	Client: Caroline Caron | Accompagnateur présent	2026-06-27 21:37:13.311506	2026-06-27 21:37:13.311506
fff7d6a7-05c0-4b7d-ae01-b280194ed4cf	EXO-0705-002	2026-07-05	09:10:00	09:58:00	BERLINE	120 Rue Principale J3X1P7 Varennes	\N	\N	1111 Rue St-Charles Ouest J4K5G4 Longueuil	\N	\N	\N	en_attente	Client: Émilie Tremblay | Bagages volumineux	2026-06-27 21:37:13.339377	2026-06-27 21:37:13.339377
da7a479a-7308-4b50-b50d-7888f8cb72cf	EXO-0705-003	2026-07-05	15:55:00	16:22:00	BERLINE	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	800 Boul de Maisonneuve H3A0A9 Montréal	\N	\N	\N	en_attente	Client: Geneviève Lefebvre | Accompagnateur présent	2026-06-27 21:37:13.345663	2026-06-27 21:37:13.345663
1ff3015a-5c58-4990-af0a-7fb67134500d	EXO-0705-004	2026-07-05	13:35:00	14:17:00	BERLINE	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	500 Boul René-Lévesque H2Z1A1 Montréal	\N	\N	\N	en_attente	Client: Isabelle Girard | Transport 4 personnes	2026-06-27 21:37:13.351289	2026-06-27 21:37:13.351289
a60d4fd1-bed1-414c-bdd0-a755004be904	EXO-0705-005	2026-07-05	13:05:00	13:28:00	BERLINE	250 Boul de la Marine J3X1G8 Varennes	\N	\N	5400 Boul Gouin Ouest H4J1C5 Montréal	\N	\N	\N	en_attente	Client: Marie Bergeron | Transport 4 personnes	2026-06-27 21:37:13.35669	2026-06-27 21:37:13.35669
188fe45e-faa3-49a9-a67a-8402a7325ebe	EXO-0705-006	2026-07-05	06:25:00	07:08:00	TAXI	88 Rue Jules-Choquet J3X2H1 Varennes	\N	\N	5400 Boul Gouin Ouest H4J1C5 Montréal	\N	\N	\N	en_attente	Client: Julie Nadeau	2026-06-27 21:37:13.360329	2026-06-27 21:37:13.360329
a8f93c09-ee59-4797-9a1b-785f2944ed54	EXO-0705-007	2026-07-05	13:00:00	13:43:00	BERLINE	45 Avenue des Pins J3X2K4 Varennes	\N	\N	2200 Rue University H3A2A6 Montréal	\N	\N	\N	en_attente	Client: Martin Lefebvre	2026-06-27 21:37:13.365191	2026-06-27 21:37:13.365191
25bf6b31-8e4b-4f91-8f17-e512ce858326	EXO-0705-008	2026-07-05	17:10:00	17:50:00	BERLINE	15 Rue de la Gare J3X1T9 Varennes	\N	\N	900 Boul St-Joseph J4B5E5 Longueuil	\N	\N	\N	en_attente	Client: Sandra Morin	2026-06-27 21:37:13.377785	2026-06-27 21:37:13.377785
4920ee23-5b15-477c-b77b-6d0b12e6ac35	EXO-0705-009	2026-07-05	11:55:00	12:15:00	TAXI	88 Rue Jules-Choquet J3X2H1 Varennes	\N	\N	1051 Rue Sanguinet H2X3E4 Montréal	\N	\N	\N	en_attente	Client: Michel Simard | Accompagnateur présent	2026-06-27 21:37:13.381373	2026-06-27 21:37:13.381373
4a688219-0046-47ac-8462-3ec135490160	EXO-0705-010	2026-07-05	11:05:00	11:42:00	VAN	78 Chemin du Fleuve J3X1R2 Varennes	\N	\N	900 Boul St-Joseph J4B5E5 Longueuil	\N	\N	\N	en_attente	Client: Julie Nadeau | Retour rendez-vous médical	2026-06-27 21:37:13.385261	2026-06-27 21:37:13.385261
7618f5d5-13b5-4825-8bf6-ca91921f5546	EXO-0705-011	2026-07-05	13:00:00	13:28:00	VAN	250 Boul de la Marine J3X1G8 Varennes	\N	\N	900 Boul St-Joseph J4B5E5 Longueuil	\N	\N	\N	en_attente	Client: Annie Dubé | Client en fauteuil roulant	2026-06-27 21:37:13.389031	2026-06-27 21:37:13.389031
d4e9b34c-9d3c-462b-8249-e07f11dbf2c5	EXO-0705-012	2026-07-05	11:20:00	12:05:00	BERLINE	45 Avenue des Pins J3X2K4 Varennes	\N	\N	1000 Rue Sherbrooke H3A1G4 Montréal	\N	\N	\N	en_attente	Client: Chantal Bélanger	2026-06-27 21:37:13.393922	2026-06-27 21:37:13.393922
713ca291-c5eb-4276-be23-a27c7857c4e5	EXO-0705-013	2026-07-05	07:15:00	08:04:00	BERLINE	15 Rue de la Gare J3X1T9 Varennes	\N	\N	1051 Rue Sanguinet H2X3E4 Montréal	\N	\N	\N	en_attente	Client: François Simard	2026-06-27 21:37:13.397906	2026-06-27 21:37:13.397906
e7620b35-279a-4b72-8c94-5a954291f2a7	EXO-0705-014	2026-07-05	12:15:00	12:58:00	VAN	78 Chemin du Fleuve J3X1R2 Varennes	\N	\N	150 Rue Peel H3C2G8 Montréal	\N	\N	\N	en_attente	Client: Josée Pelletier | Appeler avant l'arrivée	2026-06-27 21:37:13.401518	2026-06-27 21:37:13.401518
7d0b8d06-c963-4d96-8c20-4fc0068e0e49	EXO-0705-015	2026-07-05	13:40:00	14:26:00	TAXI	78 Chemin du Fleuve J3X1R2 Varennes	\N	\N	150 Rue Peel H3C2G8 Montréal	\N	\N	\N	en_attente	Client: Josée Bergeron | Appeler avant l'arrivée	2026-06-27 21:37:13.406407	2026-06-27 21:37:13.406407
e80e2f3b-e750-4b18-8cca-2dcaac467a1a	EXO-0705-016	2026-07-05	13:55:00	14:35:00	VAN	78 Chemin du Fleuve J3X1R2 Varennes	\N	\N	1111 Rue St-Charles Ouest J4K5G4 Longueuil	\N	\N	\N	en_attente	Client: Daniel Dubé	2026-06-27 21:37:13.410794	2026-06-27 21:37:13.410794
79459ce3-1314-477c-a37c-2b9a2edcc8d6	EXO-0705-017	2026-07-05	11:15:00	11:49:00	TAXI	300 Montée de Picardie J3X0B5 Varennes	\N	\N	2200 Rue University H3A2A6 Montréal	\N	\N	\N	en_attente	Client: Sylvain Boucher | Appeler avant l'arrivée	2026-06-27 21:37:13.415018	2026-06-27 21:37:13.415018
a53875fb-d208-431a-8745-90ee2ea97fd2	EXO-0705-018	2026-07-05	09:55:00	10:39:00	VAN	88 Rue Jules-Choquet J3X2H1 Varennes	\N	\N	150 Rue Peel H3C2G8 Montréal	\N	\N	\N	en_attente	Client: Sophie Lavoie | Appeler avant l'arrivée	2026-06-27 21:37:13.418881	2026-06-27 21:37:13.418881
8e3910f5-7acf-4cc0-ba8f-cd0a79c71acc	EXO-0705-019	2026-07-05	16:15:00	16:42:00	BERLINE	5 Place du Marché J3X1A9 Varennes	\N	\N	1111 Rue St-Charles Ouest J4K5G4 Longueuil	\N	\N	\N	en_attente	Client: Jean Poirier | Transport 4 personnes	2026-06-27 21:37:13.423389	2026-06-27 21:37:13.423389
9505cf64-d65d-4018-af83-51de846cae48	EXO-0705-020	2026-07-05	08:05:00	08:26:00	TAXI	250 Boul de la Marine J3X1G8 Varennes	\N	\N	800 Boul de Maisonneuve H3A0A9 Montréal	\N	\N	\N	en_attente	Client: Josée Gagnon	2026-06-27 21:37:13.427915	2026-06-27 21:37:13.427915
e7597173-0529-4c5a-8478-b84d65a799c3	EXO-0705-021	2026-07-05	09:00:00	09:28:00	BERLINE	5 Place du Marché J3X1A9 Varennes	\N	\N	150 Rue Peel H3C2G8 Montréal	\N	\N	\N	en_attente	Client: Annie Bergeron | Appeler avant l'arrivée	2026-06-27 21:37:13.43187	2026-06-27 21:37:13.43187
d7f92235-5264-4f5a-b242-206b7712c62f	EXO-0705-022	2026-07-05	06:20:00	06:54:00	TAXI	12 Rue Sainte-Anne J3X1C3 Varennes	\N	\N	150 Rue Peel H3C2G8 Montréal	\N	\N	\N	en_attente	Client: Nathalie Lefebvre | Accompagnateur présent	2026-06-27 21:37:13.436072	2026-06-27 21:37:13.436072
61c64ac8-a37e-4f96-9f63-c786d70a2f65	EXO-0629-004	2026-06-29	10:45:00	11:14:00	TAXI	410 Rang du Bord-de-l'eau J3X0K2 Varennes	45.6834691	-73.4362737	1111 Rue St-Charles Ouest J4K5G4 Longueuil	45.5261385	-73.5199472	\N	en_attente	Client: Chantal Caron | Retour rendez-vous médical	2026-06-28 01:19:16.759191	2026-06-28 01:19:16.759191
6ae595fa-8d43-4a27-ae61-3dee1b94b1a1	EXO-0629-006	2026-06-29	08:15:00	08:46:00	TAXI	5 Place du Marché J3X1A9 Varennes	45.6834691	-73.4362737	1000 Rue Sherbrooke H3A1G4 Montréal	45.5027317	-73.5750886	\N	en_attente	Client: Marc Pelletier	2026-06-28 01:19:16.767757	2026-06-28 01:19:16.767757
\.


--
-- Name: affectations affectations_pkey; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.affectations
    ADD CONSTRAINT affectations_pkey PRIMARY KEY (id);


--
-- Name: affectations affectations_trajet_id_date_programme_key; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.affectations
    ADD CONSTRAINT affectations_trajet_id_date_programme_key UNIQUE (trajet_id, date_programme);


--
-- Name: chauffeurs chauffeurs_email_key; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.chauffeurs
    ADD CONSTRAINT chauffeurs_email_key UNIQUE (email);


--
-- Name: chauffeurs chauffeurs_numero_chauffeur_key; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.chauffeurs
    ADD CONSTRAINT chauffeurs_numero_chauffeur_key UNIQUE (numero_chauffeur);


--
-- Name: chauffeurs chauffeurs_pkey; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.chauffeurs
    ADD CONSTRAINT chauffeurs_pkey PRIMARY KEY (id);


--
-- Name: consultation_logs consultation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.consultation_logs
    ADD CONSTRAINT consultation_logs_pkey PRIMARY KEY (id);


--
-- Name: consultation_logs consultation_logs_token_key; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.consultation_logs
    ADD CONSTRAINT consultation_logs_token_key UNIQUE (token);


--
-- Name: disponibilites disponibilites_chauffeur_id_date_dispo_heure_debut_key; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.disponibilites
    ADD CONSTRAINT disponibilites_chauffeur_id_date_dispo_heure_debut_key UNIQUE (chauffeur_id, date_dispo, heure_debut);


--
-- Name: disponibilites disponibilites_pkey; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.disponibilites
    ADD CONSTRAINT disponibilites_pkey PRIMARY KEY (id);


--
-- Name: envois_email envois_email_pkey; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.envois_email
    ADD CONSTRAINT envois_email_pkey PRIMARY KEY (id);


--
-- Name: gps_logs gps_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.gps_logs
    ADD CONSTRAINT gps_logs_pkey PRIMARY KEY (id);


--
-- Name: routes routes_pkey; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (id);


--
-- Name: stops stops_pkey; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT stops_pkey PRIMARY KEY (id);


--
-- Name: trajets trajets_code_date_unique; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.trajets
    ADD CONSTRAINT trajets_code_date_unique UNIQUE (code_trajet, date_trajet);


--
-- Name: trajets trajets_code_trajet_date_key; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.trajets
    ADD CONSTRAINT trajets_code_trajet_date_key UNIQUE (code_trajet, date_trajet);


--
-- Name: trajets trajets_code_trajet_unique; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.trajets
    ADD CONSTRAINT trajets_code_trajet_unique UNIQUE (code_trajet);


--
-- Name: trajets trajets_pkey; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.trajets
    ADD CONSTRAINT trajets_pkey PRIMARY KEY (id);


--
-- Name: stops uq_stop_route_ordre; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT uq_stop_route_ordre UNIQUE (route_id, ordre);


--
-- Name: idx_affectations_chauf; Type: INDEX; Schema: public; Owner: dispatch_user
--

CREATE INDEX idx_affectations_chauf ON public.affectations USING btree (chauffeur_id);


--
-- Name: idx_affectations_date; Type: INDEX; Schema: public; Owner: dispatch_user
--

CREATE INDEX idx_affectations_date ON public.affectations USING btree (date_programme);


--
-- Name: idx_consultation_logs_chauffeur; Type: INDEX; Schema: public; Owner: dispatch_user
--

CREATE INDEX idx_consultation_logs_chauffeur ON public.consultation_logs USING btree (chauffeur_id);


--
-- Name: idx_consultation_logs_date; Type: INDEX; Schema: public; Owner: dispatch_user
--

CREATE INDEX idx_consultation_logs_date ON public.consultation_logs USING btree (date_programme);


--
-- Name: idx_disponibilites_chauf; Type: INDEX; Schema: public; Owner: dispatch_user
--

CREATE INDEX idx_disponibilites_chauf ON public.disponibilites USING btree (chauffeur_id);


--
-- Name: idx_disponibilites_date; Type: INDEX; Schema: public; Owner: dispatch_user
--

CREATE INDEX idx_disponibilites_date ON public.disponibilites USING btree (date_dispo);


--
-- Name: idx_gps_chauf_date; Type: INDEX; Schema: public; Owner: dispatch_user
--

CREATE INDEX idx_gps_chauf_date ON public.gps_logs USING btree (chauffeur_id, received_at DESC);


--
-- Name: idx_gps_event_type; Type: INDEX; Schema: public; Owner: dispatch_user
--

CREATE INDEX idx_gps_event_type ON public.gps_logs USING btree (event_type);


--
-- Name: idx_gps_route; Type: INDEX; Schema: public; Owner: dispatch_user
--

CREATE INDEX idx_gps_route ON public.gps_logs USING btree (route_id, received_at);


--
-- Name: idx_routes_chauffeur; Type: INDEX; Schema: public; Owner: dispatch_user
--

CREATE INDEX idx_routes_chauffeur ON public.routes USING btree (chauffeur_id);


--
-- Name: idx_routes_date; Type: INDEX; Schema: public; Owner: dispatch_user
--

CREATE INDEX idx_routes_date ON public.routes USING btree (date_planifiee);


--
-- Name: idx_routes_statut; Type: INDEX; Schema: public; Owner: dispatch_user
--

CREATE INDEX idx_routes_statut ON public.routes USING btree (statut);


--
-- Name: idx_stops_route; Type: INDEX; Schema: public; Owner: dispatch_user
--

CREATE INDEX idx_stops_route ON public.stops USING btree (route_id);


--
-- Name: idx_stops_statut; Type: INDEX; Schema: public; Owner: dispatch_user
--

CREATE INDEX idx_stops_statut ON public.stops USING btree (statut);


--
-- Name: idx_trajets_date; Type: INDEX; Schema: public; Owner: dispatch_user
--

CREATE INDEX idx_trajets_date ON public.trajets USING btree (date_trajet);


--
-- Name: affectations affectations_chauffeur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.affectations
    ADD CONSTRAINT affectations_chauffeur_id_fkey FOREIGN KEY (chauffeur_id) REFERENCES public.chauffeurs(id) ON DELETE CASCADE;


--
-- Name: affectations affectations_modifiee_par_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.affectations
    ADD CONSTRAINT affectations_modifiee_par_fkey FOREIGN KEY (modifiee_par) REFERENCES public.chauffeurs(id);


--
-- Name: affectations affectations_trajet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.affectations
    ADD CONSTRAINT affectations_trajet_id_fkey FOREIGN KEY (trajet_id) REFERENCES public.trajets(id) ON DELETE CASCADE;


--
-- Name: consultation_logs consultation_logs_chauffeur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.consultation_logs
    ADD CONSTRAINT consultation_logs_chauffeur_id_fkey FOREIGN KEY (chauffeur_id) REFERENCES public.chauffeurs(id);


--
-- Name: disponibilites disponibilites_chauffeur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.disponibilites
    ADD CONSTRAINT disponibilites_chauffeur_id_fkey FOREIGN KEY (chauffeur_id) REFERENCES public.chauffeurs(id) ON DELETE CASCADE;


--
-- Name: envois_email envois_email_chauffeur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.envois_email
    ADD CONSTRAINT envois_email_chauffeur_id_fkey FOREIGN KEY (chauffeur_id) REFERENCES public.chauffeurs(id);


--
-- Name: envois_email envois_email_envoye_par_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.envois_email
    ADD CONSTRAINT envois_email_envoye_par_fkey FOREIGN KEY (envoye_par) REFERENCES public.chauffeurs(id);


--
-- Name: gps_logs gps_logs_chauffeur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.gps_logs
    ADD CONSTRAINT gps_logs_chauffeur_id_fkey FOREIGN KEY (chauffeur_id) REFERENCES public.chauffeurs(id) ON DELETE RESTRICT;


--
-- Name: gps_logs gps_logs_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.gps_logs
    ADD CONSTRAINT gps_logs_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE SET NULL;


--
-- Name: gps_logs gps_logs_stop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.gps_logs
    ADD CONSTRAINT gps_logs_stop_id_fkey FOREIGN KEY (stop_id) REFERENCES public.stops(id) ON DELETE SET NULL;


--
-- Name: routes routes_chauffeur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_chauffeur_id_fkey FOREIGN KEY (chauffeur_id) REFERENCES public.chauffeurs(id) ON DELETE RESTRICT;


--
-- Name: stops stops_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT stops_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO dispatch_user;


--
-- PostgreSQL database dump complete
--

\unrestrict SuGWVZ0LV9ICDdYJrW1yFxPaCGMYmfWFFZnl8bg7ebmOpr1KscltijnoNe1i471

