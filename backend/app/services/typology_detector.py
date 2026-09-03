from typing import List, Dict, Any

class TypologyDetector:
    """
    Deterministic motif and laundering topology engine.
    Detects: Rapid pass-through, Fan-in/out, Smurfing, and Circular rings.
    """
    
    @staticmethod
    def detect_pass_through(amount: float, setup_gap_minutes: float) -> Dict[str, str]:
        if setup_gap_minutes < 15.0 and amount >= 5000.0:
            return {
                "name": "Rapid Pass-Through Mule Behavior",
                "evidence": f"Large transfer (${amount:,.2f}) executed {int(setup_gap_minutes)} minutes after account/payee modification."
            }
        return {}

    @staticmethod
    def detect_fan_in_out(neighbor_count: int, is_receiving: bool = True) -> Dict[str, str]:
        if neighbor_count >= 5:
            direction = "Fan-In Collection Hub" if is_receiving else "Fan-Out Distribution Hub"
            return {
                "name": direction,
                "evidence": f"Account interacts with {neighbor_count} distinct counterparties in active window."
            }
        return {}

    @staticmethod
    def detect_smurfing(transaction_amounts: List[float]) -> Dict[str, str]:
        """Detects structuring (smurfing) just below reporting thresholds (e.g., $10,000)."""
        suspicious_txns = [amt for amt in transaction_amounts if 9000 <= amt <= 9999]
        if len(suspicious_txns) >= 3:
            return {
                "name": "Smurfing / Structuring",
                "evidence": f"{len(suspicious_txns)} transactions detected just below the $10k reporting threshold."
            }
        return {}

    @staticmethod
    def detect_cycles(is_ring_member: bool, amount: float, neighbor_count: int) -> Dict[str, str]:
        if is_ring_member or (amount >= 20000.0 and neighbor_count >= 3):
            return {
                "name": "Cross-Bank Coordinated Mule Ring",
                "evidence": "Account identified in a circular transaction flow traversing multiple financial entities."
            }
        return {}

    @staticmethod
    def detect_typologies(
        amount: float,
        setup_gap_minutes: float,
        neighbor_count: int,
        is_ring_member: bool = False,
        historical_amounts: List[float] = None
    ) -> List[Dict[str, str]]:
        if historical_amounts is None:
            historical_amounts = []
            
        typologies = []
        
        pt = TypologyDetector.detect_pass_through(amount, setup_gap_minutes)
        if pt: typologies.append(pt)
            
        fio = TypologyDetector.detect_fan_in_out(neighbor_count)
        if fio: typologies.append(fio)
            
        smurf = TypologyDetector.detect_smurfing(historical_amounts + [amount])
        if smurf: typologies.append(smurf)
            
        cycle = TypologyDetector.detect_cycles(is_ring_member, amount, neighbor_count)
        if cycle: typologies.append(cycle)

        return typologies

typology_detector = TypologyDetector()
