--
-- PostgreSQL database dump
--

\restrict axKcCyFSY1keDFY7ZcraDCkVsg5N4TrJeGFhTFIOT03rlhP2YvH24lkSWPN1udu

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
    modifie_le timestamp without time zone DEFAULT now()
);


ALTER TABLE public.chauffeurs OWNER TO dispatch_user;

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
6f3c37c7-0cb2-47be-8e8e-5d01c0f3fc85	e96fea9d-487d-4570-8c2e-9ebc43703e55	d72307ff-4c1c-4cda-b65a-9e40b1757a45	2026-04-23	manuel	\N	confirmee	\N	\N	2026-04-23 05:04:47.588649	2026-04-23 05:04:47.588649
\.


--
-- Data for Name: chauffeurs; Type: TABLE DATA; Schema: public; Owner: dispatch_user
--

COPY public.chauffeurs (id, numero_chauffeur, nom, prenom, email, telephone, adresse_domicile, lat_domicile, lng_domicile, type_vehicule, actif, mot_de_passe_hash, role, cree_le, modifie_le) FROM stdin;
6c4efa13-53d2-47fb-a8b2-f1c504c31156	000	Admin	Dispatch	tadilihatim+000@gmail.com	\N	500 Boul. Cremazie Est, Montreal	\N	\N	TAXI	t	$2a$10$mgj6s1nF7dUOUYCzqZePBunudLccor0x8N4U4vrKbUl64xspfkCKO	dispatch	2026-03-28 14:25:13.059415	2026-03-28 14:25:13.059415
d72307ff-4c1c-4cda-b65a-9e40b1757a45	MOB-001	Test	Mobile	mobile-test@dispatchtaxi.local	\N	1 Rue Test, Montréal H0H 0H0	\N	\N	TAXI	t	$2a$10$uwxvvm.tvikMKmfjfuDqf.qwfXWRD5AXl.iBeApDbmSeEVpK7/epC	chauffeur	2026-04-22 23:46:52.213112	2026-04-22 23:46:52.213112
f8aa0514-4755-40d8-95b7-41eb5df66a2d	009	Tadili	Hatim	tadilihatim+009@gmail.com	514-384-1830	500 Boul. Cremazie Est, Montreal H2P 1E7	\N	\N	TAXI	t	$2a$10$xKv8JrmZGr98n49Uz4Bq7eMxHLhXsxTblrXCZKisj7oMMMOow8eg2	chauffeur	2026-03-28 14:27:28.025683	2026-03-28 14:27:28.025683
2fb8af64-bf43-46d3-9053-5fd673a68c2a	012	Dubois	Marc	tadilihatim+012@gmail.com	514-555-0012	227 Rue Principale, Longueuil J4H 1A1	\N	\N	TAXI	t	$2a$10$i6xcNDj0BpZ/6jEODP.czeNZsrcPYCK0Tf04my3s80CTicuYqZYPi	chauffeur	2026-03-28 14:27:28.471365	2026-03-28 14:27:28.471365
fd4bc826-7b37-476f-be0f-a00dc64fc4ae	015	Tremblay	Sophie	tadilihatim+015@gmail.com	514-555-0015	1800 Henri-Blaquiere, Chambly J3L 3E9	\N	\N	BERLINE	t	$2a$10$zPehZEUcG4DeKMLPh5Rvy.sl7aDqXXvk7i8bX.xA7yK/y8GAtw5Qm	chauffeur	2026-03-28 14:27:28.588547	2026-03-28 14:27:28.588547
88e6f06f-a598-4a10-aa21-b4d0f4e2aa9d	021	Gagnon	Pierre	tadilihatim+021@gmail.com	514-555-0021	730 Abbe-Theoret, Sainte-Julie J3E 0E1	\N	\N	TAXI	t	$2a$10$HGZDnLypnYAlxjThrZj6e.jFjQWXVEf8lDUmSlnxX7M/qINqD.zfW	chauffeur	2026-03-28 14:27:28.708134	2026-03-28 14:27:28.708134
ac57e90e-f690-4506-9246-12b2896daf12	034	Roy	Marie	tadilihatim+034@gmail.com	514-555-0034	61 De Montbrun, Boucherville J4B 5T3	\N	\N	TAXI	t	$2a$10$YMmId23ojBj9DX0HdHt37uf94OGa.OCkN4Lx72Shvh91IVNe6HT9m	chauffeur	2026-03-28 14:27:28.847849	2026-03-28 14:27:28.847849
5df0dd59-c2f6-4075-8d43-c82892209c90	041	Belanger	Luc	tadilihatim+041@gmail.com	514-555-0041	3355 Autoroute, Laval H7T 0H4	\N	\N	TAXI	t	$2a$10$A062LRGXNQmXZ5IFdcH/e.i7k5gPybt9jkljU9JlbD8XVGlRgtAgC	chauffeur	2026-03-28 14:27:28.98232	2026-03-28 14:27:28.98232
e2f8c134-2778-45ed-803d-ab40d7db761b	055	Cote	Julie	tadilihatim+055@gmail.com	514-555-0055	2100 Boul. Lapiniere, Brossard J4W 2T5	\N	\N	BERLINE	t	$2a$10$S/yLgInf/MNQc9j3bS.5VedAK0DSKvRiG4zCr.knkC2.z.Kesytxu	chauffeur	2026-03-28 14:27:29.115067	2026-03-28 14:27:29.115067
\.


--
-- Data for Name: disponibilites; Type: TABLE DATA; Schema: public; Owner: dispatch_user
--

COPY public.disponibilites (id, chauffeur_id, date_dispo, heure_debut, heure_fin, soumis_le, modifie_le, note_journee) FROM stdin;
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
\.


--
-- Data for Name: envois_email; Type: TABLE DATA; Schema: public; Owner: dispatch_user
--

COPY public.envois_email (id, chauffeur_id, date_programme, envoye_par, envoye_le, nb_trajets, statut_envoi, erreur) FROM stdin;
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
cf455c83-a86e-42ef-8822-12ebdc21d047	d72307ff-4c1c-4cda-b65a-9e40b1757a45	Tournée Mobile Test	2026-04-23	planifiee	\N	\N	2026-04-23 05:04:47.534689+00	2026-04-23 05:04:47.534689+00
\.


--
-- Data for Name: stops; Type: TABLE DATA; Schema: public; Owner: dispatch_user
--

COPY public.stops (id, route_id, ordre, adresse, latitude, longitude, rayon_geofence_m, notes, statut, heure_arrivee_prevue, heure_arrivee_reelle, created_at, updated_at) FROM stdin;
1b6b69cc-b403-48bb-bcf4-6453e8aeed85	cf455c83-a86e-42ef-8822-12ebdc21d047	1	1000 Rue de la Gauchetière O, Montréal	45.5009	-73.5694	50	\N	en_attente	2026-04-23 08:00:00+00	\N	2026-04-23 05:04:47.540566+00	2026-04-23 05:04:47.540566+00
9b62c202-5524-43ed-857e-898cc3e0fceb	cf455c83-a86e-42ef-8822-12ebdc21d047	2	1500 Boul René-Lévesque O, Montréal	45.4977	-73.5786	50	\N	en_attente	2026-04-23 08:30:00+00	\N	2026-04-23 05:04:47.545811+00	2026-04-23 05:04:47.545811+00
85cf9035-1014-4a35-987b-47a95adbbe6e	cf455c83-a86e-42ef-8822-12ebdc21d047	3	2000 Rue Saint-Catherine O, Montréal	45.4933	-73.5829	50	\N	en_attente	2026-04-23 09:00:00+00	\N	2026-04-23 05:04:47.552122+00	2026-04-23 05:04:47.552122+00
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
-- Name: trajets trajets_code_trajet_date_key; Type: CONSTRAINT; Schema: public; Owner: dispatch_user
--

ALTER TABLE ONLY public.trajets
    ADD CONSTRAINT trajets_code_trajet_date_key UNIQUE (code_trajet, date_trajet);


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

\unrestrict axKcCyFSY1keDFY7ZcraDCkVsg5N4TrJeGFhTFIOT03rlhP2YvH24lkSWPN1udu

