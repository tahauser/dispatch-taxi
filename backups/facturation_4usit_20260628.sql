--
-- PostgreSQL database dump
--

\restrict PS6GFJmy5ZRR2X6kThYwM1VLxweIguJmEV3pHVihREGvAKMhh5LYzPqH0wq0QoC

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom character varying(200) NOT NULL,
    adresse text,
    ville character varying(100),
    pays character varying(100),
    email character varying(200),
    telephone character varying(50),
    ice character varying(50),
    devise character varying(10) DEFAULT 'CAD'::character varying,
    langue character varying(5) DEFAULT 'fr'::character varying,
    actif boolean DEFAULT true,
    cree_le timestamp without time zone DEFAULT now()
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: compteurs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.compteurs (
    annee integer NOT NULL,
    sequence integer DEFAULT 0
);


ALTER TABLE public.compteurs OWNER TO postgres;

--
-- Name: factures; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.factures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero character varying(50) NOT NULL,
    client_id uuid NOT NULL,
    modele_id uuid NOT NULL,
    date_facture date DEFAULT CURRENT_DATE NOT NULL,
    date_echeance date,
    reference character varying(100),
    statut character varying(20) DEFAULT 'brouillon'::character varying,
    sous_total numeric(12,2) DEFAULT 0,
    taux_tva numeric(5,2) DEFAULT 0,
    montant_tva numeric(12,2) DEFAULT 0,
    total numeric(12,2) DEFAULT 0,
    devise character varying(10) DEFAULT 'CAD'::character varying,
    notes text,
    conditions text DEFAULT '30 jours'::text,
    cree_le timestamp without time zone DEFAULT now(),
    modifie_le timestamp without time zone DEFAULT now()
);


ALTER TABLE public.factures OWNER TO postgres;

--
-- Name: lignes_facture; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lignes_facture (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    facture_id uuid NOT NULL,
    description text NOT NULL,
    quantite numeric(10,2) DEFAULT 1,
    prix_unitaire numeric(12,2) DEFAULT 0,
    taux_tva numeric(5,2) DEFAULT 0,
    total numeric(12,2) DEFAULT 0,
    ordre integer DEFAULT 0
);


ALTER TABLE public.lignes_facture OWNER TO postgres;

--
-- Name: modeles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.modeles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom character varying(100) NOT NULL,
    description text,
    style jsonb DEFAULT '{}'::jsonb,
    actif boolean DEFAULT true,
    cree_le timestamp without time zone DEFAULT now()
);


ALTER TABLE public.modeles OWNER TO postgres;

--
-- Name: paiements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paiements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    facture_id uuid NOT NULL,
    date_paiement date NOT NULL,
    montant numeric(12,2) NOT NULL,
    mode character varying(50),
    reference character varying(100),
    notes text,
    cree_le timestamp without time zone DEFAULT now()
);


ALTER TABLE public.paiements OWNER TO postgres;

--
-- Name: utilisateurs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.utilisateurs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(200) NOT NULL,
    mot_de_passe_hash character varying(255) NOT NULL,
    nom character varying(100),
    cree_le timestamp without time zone DEFAULT now()
);


ALTER TABLE public.utilisateurs OWNER TO postgres;

--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (id, nom, adresse, ville, pays, email, telephone, ice, devise, langue, actif, cree_le) FROM stdin;
d1e077d9-e5f4-4fb8-b460-70047bf1b3a3	ADVEN CONSEIL	628-455 RUE King O	Sherbrooke (Quebec) J1H6G4	Canada	\N	819-434-6256	\N	CAD	fr	t	2026-03-30 22:04:30.871719
85b4f4c0-38c8-40ef-8537-3924c176e583	Fondation Cheikh Zaid	Avenue Allal El Fassi, Madinat Al Irfane, Hay Riad	Rabat	Maroc	\N		\N	DH	fr	t	2026-03-30 22:04:30.871719
619b81b2-dcfe-4c54-a971-743e018a5a87	WEMANITY PARIS	7 rue du Colonel Moll	Paris 75017	France	\N	\N	\N	EUR	fr	t	2026-04-02 02:00:50.401832
\.


--
-- Data for Name: compteurs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.compteurs (annee, sequence) FROM stdin;
2025	12
2024	12
2023	17
2026	16
\.


--
-- Data for Name: factures; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.factures (id, numero, client_id, modele_id, date_facture, date_echeance, reference, statut, sous_total, taux_tva, montant_tva, total, devise, notes, conditions, cree_le, modifie_le) FROM stdin;
abe389a7-58b8-4cec-a7dc-cc7fd87b0403	INV/2023/003	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2023-03-01	2023-03-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
5b4d4c71-e335-4dd2-a15f-30a056b87bfc	INV/2023/004	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2023-04-01	2023-04-30	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
6647c72f-63e2-4113-b3c0-a19d0b191555	INV/2023/005	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2023-05-01	2023-05-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
110ddacb-49e2-4a63-b5c5-4182d8836634	INV/2023/006	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2023-06-01	2023-06-30	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
bdae4293-d985-4621-a9fc-ca893554cce8	INV/2023/007	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2023-07-01	2023-07-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
daa73a2e-34d1-4c4d-bc59-dece856d6e90	INV/2023/008	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2023-08-01	2023-08-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
a7c57a14-82d2-4acf-b421-3c033d2225e2	INV/2023/009	619b81b2-dcfe-4c54-a971-743e018a5a87	9481f8a2-b722-43a5-8735-0bf737ada77f	2023-08-07	2023-09-06	Expert Infrastructure Cloud	payee	14700.00	20.00	2940.00	17640.00	EUR	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
98f7ae18-cbd2-4697-b0bb-5f969b3a9c45	INV/2023/010	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2023-09-01	2023-09-30	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
7f226f81-8d6a-4c91-981b-e1f438550a0a	INV/2023/011	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2023-10-01	2023-10-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
e12094d6-908e-41c5-a956-6fae75a521aa	INV/2023/012	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2023-11-01	2023-11-30	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
6086aa52-9029-426e-9c04-fd9280e27f52	INV/2023/013	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2023-12-01	2023-12-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
bd5e1bd3-d109-4b22-a00e-1bc64180175e	INV/2023/014	619b81b2-dcfe-4c54-a971-743e018a5a87	9481f8a2-b722-43a5-8735-0bf737ada77f	2023-09-01	2023-09-30	Expert Infrastructure Cloud	payee	9800.00	20.00	1960.00	11760.00	EUR	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
817f191d-27db-4f67-937a-eb06138a03ed	INV/2023/015	619b81b2-dcfe-4c54-a971-743e018a5a87	9481f8a2-b722-43a5-8735-0bf737ada77f	2023-09-29	2023-10-28	Expert Infrastructure Cloud	payee	11200.00	20.00	2240.00	13440.00	EUR	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
49d20990-db79-4426-896d-8ba6a54a01b7	INV/2023/016	619b81b2-dcfe-4c54-a971-743e018a5a87	9481f8a2-b722-43a5-8735-0bf737ada77f	2023-10-01	2023-10-31	Expert Infrastructure Cloud	payee	15400.00	20.00	3080.00	18480.00	EUR	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
83dcf331-674d-4661-b8d9-a4868d5c974f	INV/2023/017	619b81b2-dcfe-4c54-a971-743e018a5a87	9481f8a2-b722-43a5-8735-0bf737ada77f	2023-11-01	2023-11-30	Expert Infrastructure Cloud	payee	700.00	20.00	140.00	840.00	EUR	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
9bd9ea94-4334-4ca2-a86b-91599a2c3b56	INV/2024/001	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2024-01-01	2024-01-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
4e478643-0a95-46ef-8405-7818e90dfea7	INV/2024/002	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2024-02-01	2024-02-29	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
251e89ec-7e58-4b68-b3f3-fd33eaf63040	INV/2024/003	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2024-03-01	2024-03-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
e9c36248-80a0-4720-a111-71e19970e91b	INV/2024/004	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2024-04-01	2024-04-30	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
4f59a7a7-fa81-4641-b9ab-bbbea2f4ae9e	INV/2024/005	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2024-05-01	2024-05-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
145087a1-d421-4fb3-a4e6-c419d6effd76	INV/2024/006	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2024-06-01	2024-06-30	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
f5c93523-4c8f-4b05-8806-41979024af7e	INV/2024/007	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2024-07-01	2024-07-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
a76942c2-6629-402c-a3c5-cfd56141dc6f	INV/2024/008	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2024-08-01	2024-08-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
77a04365-ce32-4584-85d2-227332c86d75	INV/2024/009	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2024-09-01	2024-09-30	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
11bb899e-8377-4ee2-9b49-e4246898dbf6	INV/2024/010	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2024-10-01	2024-10-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
f7031e6c-f02a-497d-8638-098a1585aabc	INV/2024/011	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2024-11-01	2024-11-30	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
6939fb14-22a3-4158-bf1a-ea0d85228006	INV/2024/012	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2024-12-01	2024-12-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
d5b85f61-f63d-4357-a6ba-cece6e37628e	INV/2025/001	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2025-01-01	2025-01-31	FCZ-Assistance-01/25	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
36765767-0748-48c5-bcbd-988c5099ee02	INV/2025/002	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2025-02-01	2025-02-28	FCZ-Assistance-02/25	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
c17e7031-795c-431e-b3ee-6a09469bbe20	INV/2025/003	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2025-03-01	2025-03-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
2f07cf03-955e-42ce-a0c3-2b1fffd75f13	INV/2025/004	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2025-04-01	2025-04-30	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
cfd07536-b469-45ee-94d5-37b3b372902a	INV/2025/005	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2025-05-01	2025-05-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
27c47506-6f7b-49ad-9bd4-4efd652ffeb9	INV/2025/006	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2025-06-01	2025-06-30	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
5813dd82-537c-4f15-b425-3fd7424fd480	INV/2025/007	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2025-07-01	2025-07-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
6b7cccf0-edb5-492a-80c6-f1de502d4d2b	INV/2025/008	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2025-08-01	2025-08-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
06d9bc9f-55b8-4621-94be-18dca9b74a19	INV/2025/009	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2025-09-01	2025-09-30	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
008a1df6-1037-4984-a5a8-4bd304985d15	INV/2025/010	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2025-10-01	2025-10-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
2e371151-878d-4b19-82cf-a50249b7bac9	INV/2025/011	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2025-11-01	2025-11-30	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
7787a00f-383d-4c73-928e-65081aea1a0d	INV/2025/012	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2025-12-01	2025-12-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
7151d91e-2364-472f-a5ab-5f97cbc07c1a	INV/2026/001	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2026-01-01	2026-01-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
f847c0a0-98fc-468f-a903-4ea76b776491	INV/2026/002	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2026-02-01	2026-02-28	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
f22e739c-1053-4d61-9090-79a1d8e74990	INV/2026/003	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2026-03-01	2026-03-31	FCZ-Assistance-03/23	payee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
6fc75498-92a1-4a6c-92aa-1093b1671be0	INV/2026/005	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2026-05-01	2026-05-31	FCZ-Assistance-03/23	brouillon	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
a770b0cd-2a7b-46fd-8d7f-068c7509bc0f	INV/2026/006	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2026-06-01	2026-06-30	FCZ-Assistance-03/23	brouillon	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
1eaf14da-8ada-466a-81ad-fa8b120057dc	INV/2026/007	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2026-07-01	2026-07-31	FCZ-Assistance-03/23	brouillon	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
b49bb10f-1311-4707-8af3-ba6399f4caca	INV/2026/008	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2026-08-01	2026-08-31	FCZ-Assistance-03/23	brouillon	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
5a779167-4d11-42e1-a79c-173c920ad44f	INV/2026/009	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2026-09-01	2026-09-30	FCZ-Assistance-03/23	brouillon	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
a8297e1e-a567-4c1b-b0e7-59bdac3efdd8	INV/2026/010	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2026-10-01	2026-10-31	FCZ-Assistance-03/23	brouillon	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
893d82bc-574d-4778-8dd1-a3788ecdd2c2	INV/2026/011	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2026-11-01	2026-11-30	FCZ-Assistance-03/23	brouillon	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
81072b50-28d2-441d-ad8b-44c142af6dd2	INV/2026/012	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2026-12-01	2026-12-31	FCZ-Assistance-03/23	brouillon	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
44d9c8f3-48c5-475b-b749-07ebe38536ac	INV/2026/013	d1e077d9-e5f4-4fb8-b460-70047bf1b3a3	e242859b-4e17-4537-a237-8efc65645445	2026-03-01	2026-03-31	BC01-2026-0052-4USIT	payee	2640.00	0.00	0.00	2640.00	CAD	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
0096220b-247b-4daf-9ef0-bffc8e02fa9a	INV/2026/014	d1e077d9-e5f4-4fb8-b460-70047bf1b3a3	e242859b-4e17-4537-a237-8efc65645445	2026-04-01	2026-04-30	BC02-2026-0052-4USIT	envoyee	6600.00	0.00	0.00	6600.00	CAD	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 02:00:50.401832
61d45a10-9970-4592-9c74-e4cdf047e395	INV/2026/004	85b4f4c0-38c8-40ef-8537-3924c176e583	9481f8a2-b722-43a5-8735-0bf737ada77f	2026-04-01	2026-04-30	FCZ-Assistance-03/23	envoyee	10000.00	20.00	2000.00	12000.00	DH	\N	30 jours	2026-04-02 02:00:50.401832	2026-04-02 03:00:57.858126
fc53c927-e075-4025-a2a5-d3db0917cfb1	INV/2026/016	d1e077d9-e5f4-4fb8-b460-70047bf1b3a3	e242859b-4e17-4537-a237-8efc65645445	2026-05-01	2026-05-31		brouillon	1210.00	0.00	0.00	1210.00	CAD		30 jours	2026-04-02 03:05:18.090389	2026-04-02 03:05:18.090389
\.


--
-- Data for Name: lignes_facture; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lignes_facture (id, facture_id, description, quantite, prix_unitaire, taux_tva, total, ordre) FROM stdin;
0cbc9d67-293c-4eef-bbc1-3a54021467c4	abe389a7-58b8-4cec-a7dc-cc7fd87b0403	Assistance et Maintenance Multi-Cloud Forfaitaire Mars 2023	2.00	5000.00	20.00	10000.00	0
b5e521f8-3aa2-4c92-b19b-62bd5d4717e5	5b4d4c71-e335-4dd2-a15f-30a056b87bfc	Assistance et Maintenance Multi-Cloud Forfaitaire Avril 2023	2.00	5000.00	20.00	10000.00	0
6af53b7c-6f81-4b27-847b-1a5455c33b76	6647c72f-63e2-4113-b3c0-a19d0b191555	Assistance et Maintenance Multi-Cloud Forfaitaire Mai 2023	2.00	5000.00	20.00	10000.00	0
fbf2f76a-f40d-461a-b41d-e7a7fa16fbac	110ddacb-49e2-4a63-b5c5-4182d8836634	Assistance et Maintenance Multi-Cloud Forfaitaire Juin 2023	2.00	5000.00	20.00	10000.00	0
1108b42a-2ecb-4145-9284-f91b7c1dede7	bdae4293-d985-4621-a9fc-ca893554cce8	Assistance et Maintenance Multi-Cloud Forfaitaire Juillet 2023	2.00	5000.00	20.00	10000.00	0
73c87c0a-428b-43b9-933f-573b2914099c	daa73a2e-34d1-4c4d-bc59-dece856d6e90	Assistance et Maintenance Multi-Cloud Forfaitaire Aout 2023	2.00	5000.00	20.00	10000.00	0
8366b634-1863-4b7a-a153-cd9757949efb	a7c57a14-82d2-4acf-b421-3c033d2225e2	Analyse plateforme Cloud ESDS et proposition plan de remediation	21.00	700.00	20.00	14700.00	0
72b02725-d289-4e72-a07a-78d32fc173f0	98f7ae18-cbd2-4697-b0bb-5f969b3a9c45	Assistance et Maintenance Multi-Cloud Forfaitaire Septembre 2023	2.00	5000.00	20.00	10000.00	0
9d061bc4-20e3-45c9-97d3-b6a163b9964a	7f226f81-8d6a-4c91-981b-e1f438550a0a	Assistance et Maintenance Multi-Cloud Forfaitaire Octobre 2023	2.00	5000.00	20.00	10000.00	0
8e9933fc-9ece-4ee8-b274-e13f46d7d856	e12094d6-908e-41c5-a956-6fae75a521aa	Assistance et Maintenance Multi-Cloud Forfaitaire Novembre 2023	2.00	5000.00	20.00	10000.00	0
98890e40-b230-4363-b9e2-389ace045e2f	6086aa52-9029-426e-9c04-fd9280e27f52	Assistance et Maintenance Multi-Cloud Forfaitaire Decembre 2023	2.00	5000.00	20.00	10000.00	0
40ac3aab-b1b4-4326-b0c4-af92c00b1fdc	bd5e1bd3-d109-4b22-a00e-1bc64180175e	Analyse plateforme Cloud ESDS periode 15/08/2023 - 01/09/2023	14.00	700.00	20.00	9800.00	0
944b7b7f-6e97-4c35-abcf-3ad4f2d15621	817f191d-27db-4f67-937a-eb06138a03ed	Selection fournisseur Cloud projet BSES periode 08/09/2023 - 29/09/2023	16.00	700.00	20.00	11200.00	0
354f8535-7c8d-41da-a152-abc0b7cb1d57	49d20990-db79-4426-896d-8ba6a54a01b7	Selection fournisseur Cloud projets BSES/TAMIL NADU periode 01/10/2023 - 31/10/2023	22.00	700.00	20.00	15400.00	0
a3f074ba-76a8-44a8-81eb-6aa214e3c7fe	83dcf331-674d-4661-b8d9-a4868d5c974f	Selection fournisseur Cloud projets BSES/TAMIL NADU	1.00	700.00	20.00	700.00	0
0952d1d0-8da6-4675-bf62-079521da3a0e	9bd9ea94-4334-4ca2-a86b-91599a2c3b56	Assistance et Maintenance Multi-Cloud Forfaitaire Janvier 2024	2.00	5000.00	20.00	10000.00	0
bf8c2fbf-deda-46e9-b4a4-fd25808e7d12	4e478643-0a95-46ef-8405-7818e90dfea7	Assistance et Maintenance Multi-Cloud Forfaitaire Fevrier 2024	2.00	5000.00	20.00	10000.00	0
5e6b497a-4b48-4193-b6ac-c95f6a36716a	251e89ec-7e58-4b68-b3f3-fd33eaf63040	Assistance et Maintenance Multi-Cloud Forfaitaire Mars 2024	2.00	5000.00	20.00	10000.00	0
279730bb-d5cf-4b62-8d56-57551eef7d8c	e9c36248-80a0-4720-a111-71e19970e91b	Assistance et Maintenance Multi-Cloud Forfaitaire Avril 2024	2.00	5000.00	20.00	10000.00	0
9b28b431-2763-4aa5-9b21-cb1b9303eaf8	4f59a7a7-fa81-4641-b9ab-bbbea2f4ae9e	Assistance et Maintenance Multi-Cloud Forfaitaire Mai 2024	2.00	5000.00	20.00	10000.00	0
4f4a1414-346d-484b-b33a-3618f846369c	145087a1-d421-4fb3-a4e6-c419d6effd76	Assistance et Maintenance Multi-Cloud Forfaitaire Juin 2024	2.00	5000.00	20.00	10000.00	0
fbd24141-32e5-4d32-83f9-cd468de3b448	f5c93523-4c8f-4b05-8806-41979024af7e	Assistance et Maintenance Multi-Cloud Forfaitaire Juillet 2024	2.00	5000.00	20.00	10000.00	0
a7daa7bc-bb3a-4840-8151-b22ca5b32c08	a76942c2-6629-402c-a3c5-cfd56141dc6f	Assistance et Maintenance Multi-Cloud Forfaitaire Aout 2024	2.00	5000.00	20.00	10000.00	0
718d0a77-1365-46a5-835f-6c4c87e159dc	77a04365-ce32-4584-85d2-227332c86d75	Assistance et Maintenance Multi-Cloud Forfaitaire Septembre 2024	2.00	5000.00	20.00	10000.00	0
4de2ed28-488a-4733-8aff-49d72f867f2b	11bb899e-8377-4ee2-9b49-e4246898dbf6	Assistance et Maintenance Multi-Cloud Forfaitaire Octobre 2024	2.00	5000.00	20.00	10000.00	0
c285e96c-86b3-4a48-9d8b-cab648eee99d	f7031e6c-f02a-497d-8638-098a1585aabc	Assistance et Maintenance Multi-Cloud Forfaitaire Novembre 2024	2.00	5000.00	20.00	10000.00	0
a1032861-39c6-45a8-8df1-01e9a54e3116	6939fb14-22a3-4158-bf1a-ea0d85228006	Assistance et Maintenance Multi-Cloud Forfaitaire Decembre 2024	2.00	5000.00	20.00	10000.00	0
fc87d072-4dd6-4fb6-85fa-ecfb4107323a	d5b85f61-f63d-4357-a6ba-cece6e37628e	Assistance et Maintenance Multi-Cloud Forfaitaire Janvier 2025	2.00	5000.00	20.00	10000.00	0
e5b4489c-3e64-4616-850e-146cbc7ce58e	36765767-0748-48c5-bcbd-988c5099ee02	Assistance et Maintenance Multi-Cloud Forfaitaire Fevrier 2025	2.00	5000.00	20.00	10000.00	0
5a02cd3d-d5aa-47e2-8275-f0ceff996fa1	c17e7031-795c-431e-b3ee-6a09469bbe20	Assistance et Maintenance Multi-Cloud Forfaitaire Mars 2025	2.00	5000.00	20.00	10000.00	0
4b6ce59f-4774-4532-95f1-7a6cf91926f2	2f07cf03-955e-42ce-a0c3-2b1fffd75f13	Assistance et Maintenance Multi-Cloud Forfaitaire Avril 2025	2.00	5000.00	20.00	10000.00	0
7e6befd1-70d2-44b0-ace0-0017ea7a7bab	cfd07536-b469-45ee-94d5-37b3b372902a	Assistance et Maintenance Multi-Cloud Forfaitaire Mai 2025	2.00	5000.00	20.00	10000.00	0
37e2929e-9b67-4daa-83a3-ad7bba21f028	27c47506-6f7b-49ad-9bd4-4efd652ffeb9	Assistance et Maintenance Multi-Cloud Forfaitaire Juin 2025	2.00	5000.00	20.00	10000.00	0
4da56ba5-c4aa-4194-abfe-0f54013a6652	5813dd82-537c-4f15-b425-3fd7424fd480	Assistance et Maintenance Multi-Cloud Forfaitaire Juillet 2025	2.00	5000.00	20.00	10000.00	0
a00132c4-7b76-4951-91f6-289dee26c534	6b7cccf0-edb5-492a-80c6-f1de502d4d2b	Assistance et Maintenance Multi-Cloud Forfaitaire Aout 2025	2.00	5000.00	20.00	10000.00	0
47d31e73-bd64-4d52-b3c2-6e0bd57fa905	06d9bc9f-55b8-4621-94be-18dca9b74a19	Assistance et Maintenance Multi-Cloud Forfaitaire Septembre 2025	2.00	5000.00	20.00	10000.00	0
9e57a9f7-b3a7-41de-a1cc-a13543a8283a	008a1df6-1037-4984-a5a8-4bd304985d15	Assistance et Maintenance Multi-Cloud Forfaitaire Octobre 2025	2.00	5000.00	20.00	10000.00	0
5bd19c9b-8481-46ee-95de-cbea8bfae990	2e371151-878d-4b19-82cf-a50249b7bac9	Assistance et Maintenance Multi-Cloud Forfaitaire Novembre 2025	2.00	5000.00	20.00	10000.00	0
1f3c2973-3d4b-413a-b724-03688dbdab9e	7787a00f-383d-4c73-928e-65081aea1a0d	Assistance et Maintenance Multi-Cloud Forfaitaire Decembre 2025	2.00	5000.00	20.00	10000.00	0
e7dfe9a4-e800-4de5-9245-9e2a8dec82e1	7151d91e-2364-472f-a5ab-5f97cbc07c1a	Assistance et Maintenance Multi-Cloud Forfaitaire Janvier 2026	2.00	5000.00	20.00	10000.00	0
51acc198-bfe6-494f-af40-147cd0f9f2d7	f847c0a0-98fc-468f-a903-4ea76b776491	Assistance et Maintenance Multi-Cloud Forfaitaire Fevrier 2026	2.00	5000.00	20.00	10000.00	0
c7de1468-d931-4176-adca-9071acf2fe55	f22e739c-1053-4d61-9090-79a1d8e74990	Assistance et Maintenance Multi-Cloud Forfaitaire Mars 2026	2.00	5000.00	20.00	10000.00	0
a729c0a8-8923-46f4-9c52-090fbfad93a7	61d45a10-9970-4592-9c74-e4cdf047e395	Assistance et Maintenance Multi-Cloud Forfaitaire Avril 2026	2.00	5000.00	20.00	10000.00	0
f376e4db-df0d-4d4e-9d78-e7097a4c5b16	6fc75498-92a1-4a6c-92aa-1093b1671be0	Assistance et Maintenance Multi-Cloud Forfaitaire Mai 2026	2.00	5000.00	20.00	10000.00	0
6bcc8203-b00b-467a-bd28-8d3543fb5398	a770b0cd-2a7b-46fd-8d7f-068c7509bc0f	Assistance et Maintenance Multi-Cloud Forfaitaire Juin 2026	2.00	5000.00	20.00	10000.00	0
6b0d5d80-aa1d-4188-bd7e-df738a59257a	1eaf14da-8ada-466a-81ad-fa8b120057dc	Assistance et Maintenance Multi-Cloud Forfaitaire Juillet 2026	2.00	5000.00	20.00	10000.00	0
b2207b3b-5e20-44e7-880d-c551af6c1cdc	b49bb10f-1311-4707-8af3-ba6399f4caca	Assistance et Maintenance Multi-Cloud Forfaitaire Aout 2026	2.00	5000.00	20.00	10000.00	0
453ea2a8-e6bb-47b5-bee3-b10b82982030	5a779167-4d11-42e1-a79c-173c920ad44f	Assistance et Maintenance Multi-Cloud Forfaitaire Septembre 2026	2.00	5000.00	20.00	10000.00	0
9997ce81-56ce-42e8-a0f5-052326b021de	a8297e1e-a567-4c1b-b0e7-59bdac3efdd8	Assistance et Maintenance Multi-Cloud Forfaitaire Octobre 2026	2.00	5000.00	20.00	10000.00	0
95ab4e72-1e95-495f-b553-7e8472e3ac6d	893d82bc-574d-4778-8dd1-a3788ecdd2c2	Assistance et Maintenance Multi-Cloud Forfaitaire Novembre 2026	2.00	5000.00	20.00	10000.00	0
1da3866f-91e7-4375-8f8e-f7ef214620e6	81072b50-28d2-441d-ad8b-44c142af6dd2	Assistance et Maintenance Multi-Cloud Forfaitaire Decembre 2026	2.00	5000.00	20.00	10000.00	0
dee2000b-10db-4064-8c70-86115dbd4adc	44d9c8f3-48c5-475b-b749-07ebe38536ac	Maintenance corrective et optimisation .NET - Support Visual FoxPro - Accompagnement Cloud Azure	24.00	110.00	0.00	2640.00	0
f4db209a-821b-4871-b1c5-96ba5e2f9049	0096220b-247b-4daf-9ef0-bffc8e02fa9a	Maintenance corrective et optimisation .NET - Support Visual FoxPro - Accompagnement Cloud Azure	60.00	110.00	0.00	6600.00	0
aaa42e90-464d-49b3-867f-4764045c3d67	fc53c927-e075-4025-a2a5-d3db0917cfb1	test 2	11.00	110.00	0.00	1210.00	0
\.


--
-- Data for Name: modeles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.modeles (id, nom, description, style, actif, cree_le) FROM stdin;
e242859b-4e17-4537-a237-8efc65645445	ADVEN	Modele ADVEN Conseil CAD TVA 0%	{"type": "ADVEN"}	t	2026-03-30 22:04:30.866485
9481f8a2-b722-43a5-8735-0bf737ada77f	FCZ	Modele Fondation Cheikh Zaid DH TVA 20%	{"type": "FCZ"}	t	2026-03-30 22:04:30.866485
\.


--
-- Data for Name: paiements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.paiements (id, facture_id, date_paiement, montant, mode, reference, notes, cree_le) FROM stdin;
\.


--
-- Data for Name: utilisateurs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.utilisateurs (id, email, mot_de_passe_hash, nom, cree_le) FROM stdin;
674daeb0-3f50-42d8-8132-59317261cbd2	admin@4usit.com	$2b$10$7fLjannWwKtdSpFPePU7UellesRPwM5iyI3KMAVoJ32G1Cjh/dfeO	Hatim Tadili	2026-03-30 22:04:30.857714
\.


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: compteurs compteurs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compteurs
    ADD CONSTRAINT compteurs_pkey PRIMARY KEY (annee);


--
-- Name: factures factures_numero_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.factures
    ADD CONSTRAINT factures_numero_key UNIQUE (numero);


--
-- Name: factures factures_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.factures
    ADD CONSTRAINT factures_pkey PRIMARY KEY (id);


--
-- Name: lignes_facture lignes_facture_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lignes_facture
    ADD CONSTRAINT lignes_facture_pkey PRIMARY KEY (id);


--
-- Name: modeles modeles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modeles
    ADD CONSTRAINT modeles_pkey PRIMARY KEY (id);


--
-- Name: paiements paiements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paiements
    ADD CONSTRAINT paiements_pkey PRIMARY KEY (id);


--
-- Name: utilisateurs utilisateurs_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_email_key UNIQUE (email);


--
-- Name: utilisateurs utilisateurs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_pkey PRIMARY KEY (id);


--
-- Name: factures factures_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.factures
    ADD CONSTRAINT factures_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: factures factures_modele_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.factures
    ADD CONSTRAINT factures_modele_id_fkey FOREIGN KEY (modele_id) REFERENCES public.modeles(id);


--
-- Name: lignes_facture lignes_facture_facture_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lignes_facture
    ADD CONSTRAINT lignes_facture_facture_id_fkey FOREIGN KEY (facture_id) REFERENCES public.factures(id) ON DELETE CASCADE;


--
-- Name: paiements paiements_facture_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paiements
    ADD CONSTRAINT paiements_facture_id_fkey FOREIGN KEY (facture_id) REFERENCES public.factures(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO facturation_user;


--
-- Name: TABLE clients; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.clients TO facturation_user;


--
-- Name: TABLE compteurs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.compteurs TO facturation_user;


--
-- Name: TABLE factures; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.factures TO facturation_user;


--
-- Name: TABLE lignes_facture; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lignes_facture TO facturation_user;


--
-- Name: TABLE modeles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.modeles TO facturation_user;


--
-- Name: TABLE paiements; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.paiements TO facturation_user;


--
-- Name: TABLE utilisateurs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.utilisateurs TO facturation_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO facturation_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO facturation_user;


--
-- PostgreSQL database dump complete
--

\unrestrict PS6GFJmy5ZRR2X6kThYwM1VLxweIguJmEV3pHVihREGvAKMhh5LYzPqH0wq0QoC

