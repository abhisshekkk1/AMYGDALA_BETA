from datetime import datetime, timedelta

class SpacedRepetitionService:
    """
    SuperMemo SM-2 Spaced Repetition Algorithm.
    Prioritizes cards students struggle with and spaces out mastered material.
    """

    @classmethod
    def calculate_review(
        cls,
        rating: int,  # 1: Hard, 2: Good, 3: Easy
        repetition: int,
        ease_factor: float,
        interval_days: int
    ) -> dict:
        """
        Calculates the updated SM-2 parameters based on user's recall rating.
        Rating mapping:
        1 (Hard): score 2
        2 (Good): score 4
        3 (Easy): score 5
        """
        # Map user 1-3 scale to SM-2 0-5 scale
        sm_score_map = {1: 2, 2: 4, 3: 5}
        q = sm_score_map.get(rating, 4)

        if q >= 3:
            if repetition == 0:
                new_interval = 1
            elif repetition == 1:
                new_interval = 6
            else:
                new_interval = max(1, round(interval_days * ease_factor))
            new_repetition = repetition + 1
        else:
            # Failed recall: reset repetition count
            new_repetition = 0
            new_interval = 1

        # Calculate new ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        new_ef = ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        new_ef = max(1.3, min(2.5, new_ef))

        now = datetime.utcnow()
        next_due = now + timedelta(days=new_interval)

        return {
            "repetition": new_repetition,
            "ease_factor": round(new_ef, 2),
            "interval_days": new_interval,
            "next_review_due": next_due,
            "last_reviewed_at": now,
            "last_rating": rating
        }
