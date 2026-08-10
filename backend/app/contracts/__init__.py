"""Re-export of the top-level `contracts` package.

Import from `app.contracts` within backend code (`from app.contracts import
ApplicantProfile`) instead of `import contracts` directly — this is the one
place allowed to know that contracts happens to live in a sibling package,
so if that ever changes, only this file needs to.
"""

from contracts import *  # noqa: F403
from contracts import __all__ as _contracts_all
from contracts import __version__

__all__ = [*_contracts_all, "__version__"]
