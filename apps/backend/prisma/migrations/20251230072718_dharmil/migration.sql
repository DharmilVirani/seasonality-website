-- CreateEnum
CREATE TYPE "TimeFrame" AS ENUM ('DAILY', 'MONDAY_WEEKLY', 'EXPIRY_WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "PoliticalCycle" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "cycleType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "impactScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoliticalCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialDay" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Basket" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Basket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BasketItem" (
    "id" SERIAL NOT NULL,
    "basketId" INTEGER NOT NULL,
    "tickerId" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BasketItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedData" (
    "id" SERIAL NOT NULL,
    "tickerId" INTEGER NOT NULL,
    "originalDate" TIMESTAMP(3) NOT NULL,
    "timeFrame" "TimeFrame" NOT NULL,
    "processedDate" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openInterest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "returns" DOUBLE PRECISION,
    "volatility" DOUBLE PRECISION,
    "monthOfYear" INTEGER,
    "dayOfWeek" INTEGER,
    "weekOfYear" INTEGER,
    "quarter" INTEGER,
    "politicalCycleId" INTEGER,
    "politicalImpact" DOUBLE PRECISION,
    "daysToSpecialDay" INTEGER,
    "specialDayId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessedData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySeasonalityData" (
    "id" SERIAL NOT NULL,
    "tickerId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "openInterest" DOUBLE PRECISION NOT NULL,
    "weekday" TEXT NOT NULL,
    "calendarMonthDay" INTEGER NOT NULL,
    "calendarYearDay" INTEGER NOT NULL,
    "tradingMonthDay" INTEGER,
    "tradingYearDay" INTEGER,
    "evenCalendarMonthDay" BOOLEAN NOT NULL,
    "evenCalendarYearDay" BOOLEAN NOT NULL,
    "evenTradingMonthDay" BOOLEAN,
    "evenTradingYearDay" BOOLEAN,
    "returnPoints" DOUBLE PRECISION,
    "returnPercentage" DOUBLE PRECISION,
    "positiveDay" BOOLEAN,
    "mondayWeeklyDate" TIMESTAMP(3),
    "expiryWeeklyDate" TIMESTAMP(3),
    "mondayWeekNumberMonthly" INTEGER,
    "mondayWeekNumberYearly" INTEGER,
    "evenMondayWeekNumberMonthly" BOOLEAN,
    "evenMondayWeekNumberYearly" BOOLEAN,
    "mondayWeeklyReturnPoints" DOUBLE PRECISION,
    "mondayWeeklyReturnPercentage" DOUBLE PRECISION,
    "positiveMondayWeek" BOOLEAN,
    "expiryWeekNumberMonthly" INTEGER,
    "expiryWeekNumberYearly" INTEGER,
    "evenExpiryWeekNumberMonthly" BOOLEAN,
    "evenExpiryWeekNumberYearly" BOOLEAN,
    "expiryWeeklyReturnPoints" DOUBLE PRECISION,
    "expiryWeeklyReturnPercentage" DOUBLE PRECISION,
    "positiveExpiryWeek" BOOLEAN,
    "evenMonth" BOOLEAN,
    "monthlyReturnPoints" DOUBLE PRECISION,
    "monthlyReturnPercentage" DOUBLE PRECISION,
    "positiveMonth" BOOLEAN,
    "evenYear" BOOLEAN,
    "yearlyReturnPoints" DOUBLE PRECISION,
    "yearlyReturnPercentage" DOUBLE PRECISION,
    "positiveYear" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySeasonalityData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MondayWeeklySeasonalityData" (
    "id" SERIAL NOT NULL,
    "tickerId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "openInterest" DOUBLE PRECISION NOT NULL,
    "weekday" TEXT NOT NULL,
    "weekNumberMonthly" INTEGER,
    "weekNumberYearly" INTEGER,
    "evenWeekNumberMonthly" BOOLEAN,
    "evenWeekNumberYearly" BOOLEAN,
    "returnPoints" DOUBLE PRECISION,
    "returnPercentage" DOUBLE PRECISION,
    "positiveWeek" BOOLEAN,
    "evenMonth" BOOLEAN,
    "monthlyReturnPoints" DOUBLE PRECISION,
    "monthlyReturnPercentage" DOUBLE PRECISION,
    "positiveMonth" BOOLEAN,
    "evenYear" BOOLEAN,
    "yearlyReturnPoints" DOUBLE PRECISION,
    "yearlyReturnPercentage" DOUBLE PRECISION,
    "positiveYear" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MondayWeeklySeasonalityData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpiryWeeklySeasonalityData" (
    "id" SERIAL NOT NULL,
    "tickerId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "startDate" TIMESTAMP(3),
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "openInterest" DOUBLE PRECISION NOT NULL,
    "weekday" TEXT NOT NULL,
    "weekNumberMonthly" INTEGER,
    "weekNumberYearly" INTEGER,
    "evenWeekNumberMonthly" BOOLEAN,
    "evenWeekNumberYearly" BOOLEAN,
    "returnPoints" DOUBLE PRECISION,
    "returnPercentage" DOUBLE PRECISION,
    "positiveWeek" BOOLEAN,
    "evenMonth" BOOLEAN,
    "monthlyReturnPoints" DOUBLE PRECISION,
    "monthlyReturnPercentage" DOUBLE PRECISION,
    "positiveMonth" BOOLEAN,
    "evenYear" BOOLEAN,
    "yearlyReturnPoints" DOUBLE PRECISION,
    "yearlyReturnPercentage" DOUBLE PRECISION,
    "positiveYear" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpiryWeeklySeasonalityData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlySeasonalityData" (
    "id" SERIAL NOT NULL,
    "tickerId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "openInterest" DOUBLE PRECISION NOT NULL,
    "weekday" TEXT NOT NULL,
    "evenMonth" BOOLEAN NOT NULL,
    "returnPoints" DOUBLE PRECISION,
    "returnPercentage" DOUBLE PRECISION,
    "positiveMonth" BOOLEAN,
    "evenYear" BOOLEAN,
    "yearlyReturnPoints" DOUBLE PRECISION,
    "yearlyReturnPercentage" DOUBLE PRECISION,
    "positiveYear" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlySeasonalityData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YearlySeasonalityData" (
    "id" SERIAL NOT NULL,
    "tickerId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "openInterest" DOUBLE PRECISION NOT NULL,
    "weekday" TEXT NOT NULL,
    "evenYear" BOOLEAN NOT NULL,
    "returnPoints" DOUBLE PRECISION,
    "returnPercentage" DOUBLE PRECISION,
    "positiveYear" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YearlySeasonalityData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionYear" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "country" TEXT NOT NULL,
    "electionType" TEXT NOT NULL,
    "isPreElectionYear" BOOLEAN NOT NULL DEFAULT false,
    "isMidElectionYear" BOOLEAN NOT NULL DEFAULT false,
    "isPostElectionYear" BOOLEAN NOT NULL DEFAULT false,
    "isModiYear" BOOLEAN NOT NULL DEFAULT false,
    "isBudgetYear" BOOLEAN NOT NULL DEFAULT false,
    "electionDate" TIMESTAMP(3),
    "budgetDate" TIMESTAMP(3),
    "rulingParty" TEXT,
    "oppositionParty" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectionYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonalityPattern" (
    "id" SERIAL NOT NULL,
    "tickerId" INTEGER NOT NULL,
    "timeFrame" "TimeFrame" NOT NULL,
    "patternType" TEXT NOT NULL,
    "period" INTEGER,
    "avgReturn" DOUBLE PRECISION NOT NULL,
    "volatility" DOUBLE PRECISION NOT NULL,
    "winRate" DOUBLE PRECISION NOT NULL,
    "maxGain" DOUBLE PRECISION NOT NULL,
    "maxLoss" DOUBLE PRECISION NOT NULL,
    "currentStreak" INTEGER,
    "longestStreak" INTEGER,
    "streakType" TEXT,
    "sampleSize" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "significance" DOUBLE PRECISION NOT NULL,
    "analysisDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataRangeStart" TIMESTAMP(3) NOT NULL,
    "dataRangeEnd" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonalityPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketPhenomenon" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "description" TEXT,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "avgMarketReturn" DOUBLE PRECISION,
    "affectedTickers" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketPhenomenon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatisticalCache" (
    "id" SERIAL NOT NULL,
    "tickerId" INTEGER NOT NULL,
    "timeFrame" "TimeFrame" NOT NULL,
    "analysisType" TEXT NOT NULL,
    "resultData" TEXT NOT NULL,
    "parameters" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatisticalCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PoliticalCycle_country_cycleType_idx" ON "PoliticalCycle"("country", "cycleType");

-- CreateIndex
CREATE INDEX "PoliticalCycle_startDate_endDate_idx" ON "PoliticalCycle"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "SpecialDay_date_country_idx" ON "SpecialDay"("date", "country");

-- CreateIndex
CREATE INDEX "SpecialDay_type_idx" ON "SpecialDay"("type");

-- CreateIndex
CREATE INDEX "Basket_category_idx" ON "Basket"("category");

-- CreateIndex
CREATE INDEX "BasketItem_basketId_idx" ON "BasketItem"("basketId");

-- CreateIndex
CREATE UNIQUE INDEX "BasketItem_basketId_tickerId_key" ON "BasketItem"("basketId", "tickerId");

-- CreateIndex
CREATE INDEX "ProcessedData_tickerId_timeFrame_idx" ON "ProcessedData"("tickerId", "timeFrame");

-- CreateIndex
CREATE INDEX "ProcessedData_processedDate_timeFrame_idx" ON "ProcessedData"("processedDate", "timeFrame");

-- CreateIndex
CREATE INDEX "ProcessedData_timeFrame_monthOfYear_idx" ON "ProcessedData"("timeFrame", "monthOfYear");

-- CreateIndex
CREATE INDEX "ProcessedData_politicalCycleId_idx" ON "ProcessedData"("politicalCycleId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedData_tickerId_processedDate_timeFrame_key" ON "ProcessedData"("tickerId", "processedDate", "timeFrame");

-- CreateIndex
CREATE INDEX "DailySeasonalityData_tickerId_date_idx" ON "DailySeasonalityData"("tickerId", "date");

-- CreateIndex
CREATE INDEX "DailySeasonalityData_date_idx" ON "DailySeasonalityData"("date");

-- CreateIndex
CREATE INDEX "DailySeasonalityData_weekday_idx" ON "DailySeasonalityData"("weekday");

-- CreateIndex
CREATE INDEX "DailySeasonalityData_evenYear_idx" ON "DailySeasonalityData"("evenYear");

-- CreateIndex
CREATE INDEX "DailySeasonalityData_evenMonth_idx" ON "DailySeasonalityData"("evenMonth");

-- CreateIndex
CREATE UNIQUE INDEX "DailySeasonalityData_tickerId_date_key" ON "DailySeasonalityData"("tickerId", "date");

-- CreateIndex
CREATE INDEX "MondayWeeklySeasonalityData_tickerId_date_idx" ON "MondayWeeklySeasonalityData"("tickerId", "date");

-- CreateIndex
CREATE INDEX "MondayWeeklySeasonalityData_weekNumberMonthly_idx" ON "MondayWeeklySeasonalityData"("weekNumberMonthly");

-- CreateIndex
CREATE INDEX "MondayWeeklySeasonalityData_weekNumberYearly_idx" ON "MondayWeeklySeasonalityData"("weekNumberYearly");

-- CreateIndex
CREATE UNIQUE INDEX "MondayWeeklySeasonalityData_tickerId_date_key" ON "MondayWeeklySeasonalityData"("tickerId", "date");

-- CreateIndex
CREATE INDEX "ExpiryWeeklySeasonalityData_tickerId_date_idx" ON "ExpiryWeeklySeasonalityData"("tickerId", "date");

-- CreateIndex
CREATE INDEX "ExpiryWeeklySeasonalityData_weekNumberMonthly_idx" ON "ExpiryWeeklySeasonalityData"("weekNumberMonthly");

-- CreateIndex
CREATE INDEX "ExpiryWeeklySeasonalityData_weekNumberYearly_idx" ON "ExpiryWeeklySeasonalityData"("weekNumberYearly");

-- CreateIndex
CREATE UNIQUE INDEX "ExpiryWeeklySeasonalityData_tickerId_date_key" ON "ExpiryWeeklySeasonalityData"("tickerId", "date");

-- CreateIndex
CREATE INDEX "MonthlySeasonalityData_tickerId_date_idx" ON "MonthlySeasonalityData"("tickerId", "date");

-- CreateIndex
CREATE INDEX "MonthlySeasonalityData_evenMonth_idx" ON "MonthlySeasonalityData"("evenMonth");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySeasonalityData_tickerId_date_key" ON "MonthlySeasonalityData"("tickerId", "date");

-- CreateIndex
CREATE INDEX "YearlySeasonalityData_tickerId_date_idx" ON "YearlySeasonalityData"("tickerId", "date");

-- CreateIndex
CREATE INDEX "YearlySeasonalityData_evenYear_idx" ON "YearlySeasonalityData"("evenYear");

-- CreateIndex
CREATE UNIQUE INDEX "YearlySeasonalityData_tickerId_date_key" ON "YearlySeasonalityData"("tickerId", "date");

-- CreateIndex
CREATE INDEX "ElectionYear_country_electionType_idx" ON "ElectionYear"("country", "electionType");

-- CreateIndex
CREATE UNIQUE INDEX "ElectionYear_year_country_key" ON "ElectionYear"("year", "country");

-- CreateIndex
CREATE INDEX "SeasonalityPattern_tickerId_timeFrame_patternType_idx" ON "SeasonalityPattern"("tickerId", "timeFrame", "patternType");

-- CreateIndex
CREATE INDEX "SeasonalityPattern_patternType_period_idx" ON "SeasonalityPattern"("patternType", "period");

-- CreateIndex
CREATE INDEX "MarketPhenomenon_startDate_endDate_idx" ON "MarketPhenomenon"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "StatisticalCache_tickerId_timeFrame_analysisType_idx" ON "StatisticalCache"("tickerId", "timeFrame", "analysisType");

-- CreateIndex
CREATE INDEX "StatisticalCache_expiresAt_idx" ON "StatisticalCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StatisticalCache_tickerId_timeFrame_analysisType_key" ON "StatisticalCache"("tickerId", "timeFrame", "analysisType");

-- AddForeignKey
ALTER TABLE "BasketItem" ADD CONSTRAINT "BasketItem_basketId_fkey" FOREIGN KEY ("basketId") REFERENCES "Basket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasketItem" ADD CONSTRAINT "BasketItem_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedData" ADD CONSTRAINT "ProcessedData_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedData" ADD CONSTRAINT "ProcessedData_politicalCycleId_fkey" FOREIGN KEY ("politicalCycleId") REFERENCES "PoliticalCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedData" ADD CONSTRAINT "ProcessedData_specialDayId_fkey" FOREIGN KEY ("specialDayId") REFERENCES "SpecialDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySeasonalityData" ADD CONSTRAINT "DailySeasonalityData_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MondayWeeklySeasonalityData" ADD CONSTRAINT "MondayWeeklySeasonalityData_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpiryWeeklySeasonalityData" ADD CONSTRAINT "ExpiryWeeklySeasonalityData_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlySeasonalityData" ADD CONSTRAINT "MonthlySeasonalityData_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YearlySeasonalityData" ADD CONSTRAINT "YearlySeasonalityData_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonalityPattern" ADD CONSTRAINT "SeasonalityPattern_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatisticalCache" ADD CONSTRAINT "StatisticalCache_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
