# Deway — Field Notes

Blog auto-hébergé avec :

- **Astro** pour le site et le thème entièrement sur mesure ;
- **Payload 3.86** pour écrire, sauvegarder les brouillons, conserver les versions et publier ;
- **PostgreSQL** pour les contenus en production ;
- deux formats dans la même chronologie : `Article classique` et `Session` ;
- **Umami** conservé séparément pour l’analytique.

## Production

```text
Blog      https://blog.deway.fr
Studio    https://blog.deway.fr/admin
API       https://blog.deway.fr/api/posts
```

La production tourne sur Watson. Apache termine HTTPS, puis un routeur Nginx interne distribue les requêtes entre Astro et Payload. Umami reste isolé, avec sa propre base dans l'instance PostgreSQL partagée.

## Développement local

```text
Blog      http://localhost:4321
Studio    http://localhost:3000/admin
API       http://localhost:3000/api/posts
```

## Démarrer localement

Utiliser Node.js 22 de préférence.

Terminal 1 — Payload :

```sh
npm run cms:start
```

Terminal 2 — Astro :

```sh
npm run dev
```

Lors d’une première installation :

```sh
npm run cms:install
npm --prefix astro-site install
cp .env.example .env
cp payload-cms/.env.example payload-cms/.env
cp astro-site/.env.example astro-site/.env
npm run cms:seed
```

## Écrire et publier

Dans **Publications**, créer ou ouvrir un contenu :

1. choisir `Article classique` ou `Session` ;
2. saisir le titre et le résumé court affiché sur l’accueil ;
3. laisser le statut sur `Brouillon` pendant l’écriture ;
4. écrire dans l’éditeur riche pour un article ;
5. pour une session, ajouter les messages, choisir leur rôle et les réordonner ;
6. ouvrir le panneau Live Preview pour voir le véritable thème Astro ;
7. cliquer sur `Publier` lorsque le contenu est prêt.

Payload enregistre automatiquement les brouillons et permet de comparer ou restaurer les versions. Le site public ne reçoit que les publications ayant le statut `published`.

## Preview

Payload ouvre une URL de la forme :

```text
http://localhost:4321/preview/1?secret=...
```

Astro vérifie ce secret avant de demander la dernière version du brouillon à Payload. La preview se rafraîchit après chaque autosauvegarde et porte une bannière orange pour éviter de la confondre avec le site public.

## Organisation

```text
astro-site/
  src/lib/payload.ts             client de contenu
  src/pages/preview/[id].astro   preview des brouillons
  src/components/                rendu article et session

payload-cms/
  src/collections/Posts.ts       schéma éditorial
  src/collections/Media.ts       bibliothèque d’images
  src/scripts/seed.ts            deux contenus exemples

compose.yaml                     stack Astro, Payload, PostgreSQL et Umami
```

## Vérifications

```sh
npm run build
npm run qa
```

Le contrôle navigateur vérifie l’accueil, l’article, la session, l’alignement desktop/mobile, la connexion Payload et le rendu Astro à l’intérieur du panneau Live Preview.

## Déploiement

La stack Docker de production est décrite dans `compose.yaml`. Les secrets restent exclusivement dans le fichier `.env` de Watson. Une archive de l'ancien site statique est conservée hors du dossier déployé pour permettre un retour arrière manuel.
