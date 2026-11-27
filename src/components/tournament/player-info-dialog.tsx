'use client'

import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { buildPlayerDetail } from '@/lib/pairing/player-detail'
import { PlayerFicha } from '@/components/players/player-ficha'
import type { GeneratedRound, Player } from '@/lib/pairing/engine'

export interface PlayerInfoDialogProps {
  players: Player[]
  rounds: GeneratedRound[]
  byePoints: number
  playerId: string | null
  onOpenChange: (open: boolean) => void
}

export function PlayerInfoDialog({
  players,
  rounds,
  byePoints,
  playerId,
  onOpenChange,
}: PlayerInfoDialogProps) {
  const detail = useMemo(
    () => buildPlayerDetail(players, rounds, byePoints, playerId),
    [playerId, players, rounds, byePoints],
  )

  const open = playerId !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {detail ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
                {detail.player.name}
                {detail.myRow?.isVirtual && (
                  <Badge variant="secondary" title="Elo virtual (media exponencial en la mitad de la tabla)">
                    ~{detail.eff}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {detail.player.club || 'Sin club'} ·{' '}
                {detail.myRow?.isVirtual
                  ? 'Sin Elo publicado'
                  : `Elo ${detail.player.elo}`}
              </DialogDescription>
            </DialogHeader>
            <PlayerFicha detail={detail} byePoints={byePoints} />
          </>
        ) : (
          <DialogHeader>
            <DialogTitle>Jugador no encontrado</DialogTitle>
            <DialogDescription>
              El jugador ya no está en la lista.
            </DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  )
}
