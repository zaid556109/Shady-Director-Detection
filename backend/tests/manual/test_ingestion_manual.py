import asyncio
import os
from dotenv import load_dotenv

from app.ingestion.cache import RedisResponseCache
from app.ingestion.rate_limiter import TokenBucketRateLimiter
from app.ingestion.client import CompaniesHouseClient

load_dotenv()


async def main():
    cache = RedisResponseCache(os.getenv("REDIS_URL"))
    limiter = TokenBucketRateLimiter(
        os.getenv("REDIS_URL"),
        capacity=int(os.getenv("CH_RATE_LIMIT_REQUESTS", 600)),
        window_seconds=int(os.getenv("CH_RATE_LIMIT_WINDOW_SECONDS", 300)),
    )
    client = CompaniesHouseClient(
        api_key=os.getenv("CH_API_KEY"),
        base_url=os.getenv("CH_API_BASE_URL"),
        document_base_url=os.getenv("CH_DOCUMENT_API_BASE_URL"),
        rate_limiter=limiter,
        cache=cache,
    )

    company_number = "11481748"  # Bramfield Assets Ltd
    raw_filings = await client.fetch_filing_history(company_number)

    # find an accounts filing that actually has a document attached
    accounts_filings = [f for f in raw_filings if f.get("category") == "accounts"]

    print(f"Found {len(accounts_filings)} accounts filings")
    for f in accounts_filings:
        links = f.get("links", {})
        print("-", f.get("date"), "| document link present:", "document_metadata" in links)
        print("  full links:", links)

    # try fetching the actual document for the first accounts filing
    if accounts_filings:
        doc_url = accounts_filings[0]["links"]["document_metadata"]
        print()
        print("Fetching document from:", doc_url)

        content = await client.fetch_filing_document(doc_url)
        print("Downloaded", len(content), "bytes")
        print("First 200 bytes:", content[:200])

        # save it locally so we can actually inspect what we got
        with open("sample_accounts.xhtml", "wb") as f:
            f.write(content)
        print("Saved to sample_accounts.xhtml")


if __name__ == "__main__":
    asyncio.run(main())
