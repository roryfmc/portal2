-- CreateTable
CREATE TABLE "public"."SiteOperative" (
    "id" SERIAL NOT NULL,
    "siteId" INTEGER NOT NULL,
    "operativeId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteOperative_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteOperative_siteId_operativeId_key" ON "public"."SiteOperative"("siteId", "operativeId");

-- AddForeignKey
ALTER TABLE "public"."SiteOperative" ADD CONSTRAINT "SiteOperative_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "public"."ConstructionSite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SiteOperative" ADD CONSTRAINT "SiteOperative_operativeId_fkey" FOREIGN KEY ("operativeId") REFERENCES "public"."Operative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
